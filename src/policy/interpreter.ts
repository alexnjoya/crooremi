import { randomBytes } from "node:crypto";
import { z } from "zod";
import { env } from "../config.js";
import { ensureUserOrg, resolveUserOrg, canProvisionEns } from "./ens-org.js";
import { resolveRecipients } from "./ens.js";
import { provisionPolicySubnames } from "./ens-subnames.js";
import { interpretPolicyText } from "./llm.js";
import type {
  CreatePolicyDelivery,
  ExecutePayoutLeg,
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

const recipientSchema = z.object({
  address: addressOrEnsSchema,
  label: z.string().min(1),
  bps: z.number().int().positive(),
  ens: z.string().optional(),
  subname: z.string().optional(),
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
  policy: policyBodySchema.optional(),
  recipients: z.array(recipientSchema).min(1).optional(),
});

const executePayoutLegSchema = z.object({
  policyId: z.string().min(1),
  recipient: z.object({
    address: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .transform((value) => value as `0x${string}`),
    label: z.string().min(1),
    amount: z.string().regex(/^\d+$/),
  }),
});

function newPolicyId(): string {
  return `pol_${randomBytes(6).toString("hex")}`;
}

function assertBpsSum(recipients: Array<{ bps: number }>): void {
  const total = recipients.reduce((sum, r) => sum + r.bps, 0);
  if (total !== 10_000) {
    throw new Error(`Recipient bps must sum to 10000, got ${total}`);
  }
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
    assertBpsSum(input.policy.recipients);
    return input.policy;
  }

  if (input.recipients) {
    assertBpsSum(input.recipients);
    return {
      name: input.name ?? "Split policy",
      org: input.org,
      ensParent: input.ensParent,
      recipients: input.recipients,
    };
  }

  throw new Error("Policy JSON must include policy or recipients");
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function finalizePolicy(draft: PolicyDraft): Promise<CreatePolicyDelivery> {
  assertBpsSum(draft.recipients);
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

  return {
    policyId: newPolicyId(),
    policy: {
      name: draft.name,
      recipients,
    },
    ...(ensSubnames?.length ? { ensSubnames, ensParent: parentDomain } : {}),
    ...(ensParentRegistration ? { ensParentRegistration } : {}),
  };
}

export async function interpretPolicyFromRequirements(
  requirements: string,
): Promise<CreatePolicyDelivery> {
  const trimmed = requirements.trim();
  if (!trimmed) {
    throw new Error("createPolicy requirements cannot be empty");
  }

  const asJson = tryParseJson(trimmed);
  if (asJson !== null) {
    const parsed = createPolicyJsonSchema.parse(asJson);
    const policy = normalizePolicyBody(parsed);
    return finalizePolicy(policy);
  }

  if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY) {
    throw new Error(
      "Natural-language createPolicy requires ANTHROPIC_API_KEY or OPENAI_API_KEY. " +
        "Send JSON requirements, or add an AI key to .env.",
    );
  }

  const draft = await interpretPolicyText(trimmed);
  return finalizePolicy(draft);
}

export function parseExecutePayoutLeg(requirements: string): ExecutePayoutLeg {
  const trimmed = requirements.trim();
  if (!trimmed) {
    throw new Error("executePaymentJob requirements cannot be empty");
  }

  const asJson = tryParseJson(trimmed);
  if (asJson === null) {
    throw new Error("executePaymentJob requires Schema JSON input");
  }

  return executePayoutLegSchema.parse(asJson);
}

/** CROO routes USDC to this address at payOrder time. */
export function resolveExecuteFundAddress(requirements: string): `0x${string}` {
  return parseExecutePayoutLeg(requirements).recipient.address;
}
