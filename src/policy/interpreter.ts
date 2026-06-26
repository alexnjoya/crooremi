import { randomBytes } from "node:crypto";
import { z } from "zod";
import { env } from "../config.js";
import { resolveRecipients } from "./ens.js";
import { interpretPolicyText } from "./llm.js";
import type {
  CreatePolicyDelivery,
  ExecutePaymentInput,
} from "./types.js";

type PolicyDraft = {
  name: string;
  recipients: Array<{
    address: string;
    label: string;
    bps: number;
    ens?: string;
  }>;
};

const addressOrEnsSchema = z.string().min(1);

const recipientSchema = z.object({
  address: addressOrEnsSchema,
  label: z.string().min(1),
  bps: z.number().int().positive(),
  ens: z.string().optional(),
});

const policyBodySchema = z.object({
  name: z.string().min(1),
  recipients: z.array(recipientSchema).min(1),
});

const createPolicyJsonSchema = z.object({
  name: z.string().min(1).optional(),
  policy: policyBodySchema.optional(),
  recipients: z.array(recipientSchema).min(1).optional(),
});

const executePaymentSchema = z.object({
  policyId: z.string().min(1),
  totalUsdc: z.string().regex(/^\d+$/),
  policy: z.object({
    name: z.string().min(1),
    recipients: z.array(
      z.object({
        address: z
          .string()
          .regex(/^0x[a-fA-F0-9]{40}$/)
          .transform((value) => value as `0x${string}`),
        label: z.string().min(1),
        bps: z.number().int().positive(),
      }),
    ),
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
  const recipients = await resolveRecipients(draft.recipients);
  return {
    policyId: newPolicyId(),
    policy: {
      name: draft.name,
      recipients,
    },
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

export function parseExecutePaymentInput(
  requirements: string,
): ExecutePaymentInput {
  const trimmed = requirements.trim();
  if (!trimmed) {
    throw new Error("executePaymentJob requirements cannot be empty");
  }

  const asJson = tryParseJson(trimmed);
  if (asJson === null) {
    throw new Error("executePaymentJob requires Schema JSON input");
  }

  const parsed = executePaymentSchema.parse(asJson);
  assertBpsSum(parsed.policy.recipients);
  return parsed;
}
