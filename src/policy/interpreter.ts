import { randomBytes } from "node:crypto";
import { z } from "zod";
import { env } from "../config.js";
import {
  formatRemainderNote,
  percentToBps,
  validateBps,
} from "./bps.js";
import { ensureUserOrg, resolveUserOrg, canProvisionEns } from "./ens-org.js";
import { resolveRecipients } from "./ens.js";
import { provisionPolicySubnames } from "./ens-subnames.js";
import {
  buildExecutionGuide,
  DEFAULT_GUIDE_TOTAL_USDC,
} from "./execution-guide.js";
import { interpretPolicyText } from "./llm.js";
import type {
  CreatePolicyDelivery,
} from "./types.js";

type PolicyDraft = {
  name: string;
  org?: string;
  ensParent?: string;
  recipients: Array<{
    address: string;
    label: string;
    bps: number;
    ens?: string;
    subname?: string;
  }>;
};

const addressOrEnsSchema = z.string().min(1);

const NL_JSON_KEYS = ["text", "requirements", "input", "prompt", "message"] as const;

const recipientSchema = z
  .object({
    address: addressOrEnsSchema,
    label: z.string().min(1),
    bps: z.number().int().positive().optional(),
    percent: z.union([z.number().positive(), z.string().min(1)]).optional(),
    ens: z.string().optional(),
    subname: z.string().optional(),
  })
  .transform((recipient) => {
    let bps = recipient.bps;
    if (bps === undefined && recipient.percent !== undefined) {
      const raw =
        typeof recipient.percent === "string"
          ? recipient.percent.replace(/%/g, "").trim()
          : recipient.percent;
      const pct = typeof raw === "number" ? raw : Number.parseFloat(raw);
      if (!Number.isFinite(pct) || pct <= 0) {
        throw new Error(`Invalid percent for recipient "${recipient.label}"`);
      }
      bps = percentToBps(pct);
    }
    if (!bps) {
      throw new Error(
        `Recipient "${recipient.label}" must include bps or percent`,
      );
    }
    return { ...recipient, bps };
  });

const policyBodySchema = z.object({
  name: z.string().min(1),
  org: z.string().optional(),
  ensParent: z.string().optional(),
  recipients: z.array(recipientSchema).min(1),
});

const createPolicyJsonSchema = z.object({
  name: z.string().min(1).optional(),
  org: z.string().optional(),
  ensParent: z.string().optional(),
  totalUsdc: z.string().regex(/^\d+$/).optional(),
  policy: policyBodySchema.optional(),
  recipients: z.array(recipientSchema).min(1).optional(),
});

function extractGuideTotalUsdc(raw: string): string {
  const asJson = tryParseJson(raw);
  if (asJson === null || typeof asJson !== "object" || asJson === null) {
    return DEFAULT_GUIDE_TOTAL_USDC;
  }
  const record = asJson as Record<string, unknown>;
  const total = record.totalUsdc;
  if (typeof total === "string" && /^\d+$/.test(total)) {
    return total;
  }
  return DEFAULT_GUIDE_TOTAL_USDC;
}

function newPolicyId(): string {
  return `pol_${randomBytes(6).toString("hex")}`;
}

function resolvePolicyOrgDomain(draft: PolicyDraft): string | undefined {
  if (draft.ensParent) {
    return draft.ensParent.includes(".") ? draft.ensParent : resolveUserOrg(draft.ensParent).domain;
  }
  if (draft.org) {
    return resolveUserOrg(draft.org).domain;
  }
  return undefined;
}

function normalizePolicyBody(
  input: z.infer<typeof createPolicyJsonSchema>,
): PolicyDraft {
  if (input.policy) {
    validateBps(input.policy.recipients);
    return input.policy;
  }

  if (input.recipients) {
    validateBps(input.recipients);
    return {
      name: input.name ?? "Split policy",
      org: input.org,
      ensParent: input.ensParent,
      recipients: input.recipients,
    };
  }

  throw new Error(
    "Policy JSON must include policy or recipients. " +
      "For natural language, use Text requirements or { \"text\": \"...\" }.",
  );
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function hasLlmKeys(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY);
}

/** Agent Store often wraps NL in Schema JSON — unwrap before structured parse. */
function unwrapNaturalLanguage(json: unknown): string | null {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return null;
  }

  const record = json as Record<string, unknown>;
  if (record.policy || record.recipients) {
    return null;
  }

  for (const key of NL_JSON_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

/**
 * Machine-readable JSON — explicit recipients with address, label, and bps/percent.
 * Skips LLM for speed and determinism when buyers send perfect Schema input.
 */
function isMachineStructuredPolicy(json: unknown): boolean {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return false;
  }

  const record = json as Record<string, unknown>;
  const policy = record.policy as Record<string, unknown> | undefined;
  const recipients = (record.recipients ?? policy?.recipients) as unknown;

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return false;
  }

  return recipients.every((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }
    const rec = item as Record<string, unknown>;
    return (
      typeof rec.address === "string" &&
      typeof rec.label === "string" &&
      (rec.bps !== undefined || rec.percent !== undefined)
    );
  });
}

async function parseStructuredPolicy(
  json: unknown,
  guideTotalUsdc: string,
): Promise<CreatePolicyDelivery> {
  const parsed = createPolicyJsonSchema.parse(json);
  const policy = normalizePolicyBody(parsed);
  return finalizePolicy(policy, guideTotalUsdc);
}

async function interpretNaturalLanguage(
  text: string,
  guideTotalUsdc: string,
): Promise<CreatePolicyDelivery> {
  if (!hasLlmKeys()) {
    throw new Error(
      "Natural-language createPolicy requires ANTHROPIC_API_KEY or OPENAI_API_KEY. " +
        "Send JSON with recipients (address, label, bps/percent), or add an AI key to .env.",
    );
  }

  const draft = await interpretPolicyText(text);
  return finalizePolicy(draft, guideTotalUsdc);
}

async function finalizePolicy(
  draft: PolicyDraft,
  guideTotalUsdc: string = DEFAULT_GUIDE_TOTAL_USDC,
): Promise<CreatePolicyDelivery> {
  const { allocatedBps, remainderBps } = validateBps(draft.recipients);
  let recipients = await resolveRecipients(draft.recipients);

  const parentDomain = resolvePolicyOrgDomain(draft);
  const hasSubnames = draft.recipients.some((r) => r.subname);
  let ensSubnames: CreatePolicyDelivery["ensSubnames"];
  let ensParentRegistration: CreatePolicyDelivery["ensParentRegistration"];

  if (parentDomain && hasSubnames && canProvisionEns()) {
    ensParentRegistration = await ensureUserOrg(
      draft.org ?? draft.ensParent ?? parentDomain,
    );
    const withSubnames = recipients.map((r, i) => ({
      ...r,
      subname: draft.recipients[i]?.subname,
    }));
    const provisioned = await provisionPolicySubnames(withSubnames, parentDomain);
    recipients = provisioned.recipients;
    ensSubnames = provisioned.ensSubnames;
    ensParentRegistration = provisioned.ensParentRegistration ?? undefined;
  }

  const delivery: CreatePolicyDelivery = {
    policyId: newPolicyId(),
    policy: {
      name: draft.name,
      recipients,
    },
    allocatedBps,
    remainderBps,
    ...(remainderBps > 0
      ? { remainderNote: formatRemainderNote(remainderBps) }
      : {}),
    ...(ensSubnames?.length ? { ensSubnames, ensParent: parentDomain } : {}),
    ...(ensParentRegistration ? { ensParentRegistration } : {}),
  };

  delivery.executionGuide = buildExecutionGuide(delivery, guideTotalUsdc);
  return delivery;
}

export async function interpretPolicyFromRequirements(
  requirements: string,
): Promise<CreatePolicyDelivery> {
  const trimmed = requirements.trim();
  if (!trimmed) {
    throw new Error("createPolicy requirements cannot be empty");
  }

  const guideTotalUsdc = extractGuideTotalUsdc(trimmed);
  const asJson = tryParseJson(trimmed);

  // Plain text or JSON that is not machine-structured → LLM (when keys exist).
  if (asJson === null) {
    return interpretNaturalLanguage(trimmed, guideTotalUsdc);
  }

  const naturalLanguage = unwrapNaturalLanguage(asJson);
  if (naturalLanguage !== null) {
    return interpretNaturalLanguage(naturalLanguage, guideTotalUsdc);
  }

  if (isMachineStructuredPolicy(asJson)) {
    return parseStructuredPolicy(asJson, guideTotalUsdc);
  }

  if (hasLlmKeys()) {
    return interpretNaturalLanguage(trimmed, guideTotalUsdc);
  }

  try {
    return await parseStructuredPolicy(asJson, guideTotalUsdc);
  } catch (structuredError) {
    const hint =
      structuredError instanceof Error ? structuredError.message : String(structuredError);
    throw new Error(
      `${hint} Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env for smart parsing, ` +
        "or send JSON with recipients: [{ address, label, bps|percent }].",
    );
  }
}
