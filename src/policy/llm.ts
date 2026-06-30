import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { env } from "../config.js";
import { BPS_TOTAL } from "./bps.js";

const llmPolicySchema = z.object({
  name: z.string().describe("Short human-readable policy name"),
  org: z
    .string()
    .optional()
    .describe(
      "User's org label for Base names (e.g. acme → acme.base.eth). Required when using subnames.",
    ),
  recipients: z
    .array(
      z.object({
        address: z
          .string()
          .describe("Recipient 0x address or Base name (e.g. alice.base.eth)"),
        label: z.string().describe("Role label: team, ops, treasury, etc."),
        subname: z
          .string()
          .optional()
          .describe(
            "Optional ENS sublabel under the user's org (e.g. payroll → payroll.acme.base.eth)",
          ),
        bps: z
          .number()
          .int()
          .positive()
          .describe(
            "Basis points for this recipient only. 30% = 3000 bps. Do not pad to fill 100%.",
          ),
      }),
    )
    .min(1),
});

export type LlmPolicyDraft = z.infer<typeof llmPolicySchema>;

const policyPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You convert payment split instructions into structured split policies.

Rules:
- Express each recipient share as basis points (bps). 100% = ${BPS_TOTAL} bps. 30% = 3000 bps.
- Use the percentages the user stated — do NOT renormalize to 100% if they gave partial shares.
  Example: "30% and 60%" → 3000 bps and 6000 bps (10% / 1000 bps stays unallocated).
- If the user gives ratios without % (e.g. "3:2"), treat as proportional shares of 100%.
- If shares would exceed 100%, scale down proportionally and mention it in the policy name.
- Keep addresses exactly as given (0x hex or Base names like alice.base.eth).
- Optional org: user's basename label (e.g. acme → names under acme.base.eth).
- Optional subname: short label under that org (e.g. payroll → payroll.acme.base.eth).
- Use concise labels (team, ops, treasury, wallet-a, etc.).
- "Split my balance between X and Y" with two addresses and two percentages → two recipients only.
- Input may be plain English or JSON-shaped text — interpret intent, not just keys.`,
  ],
  ["human", "{requirements}"],
]);

function createAnthropicModel() {
  return new ChatAnthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
    temperature: 0,
    maxRetries: 2,
  });
}

function createOpenAiModel() {
  return new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0,
    maxRetries: 2,
  });
}

export async function interpretPolicyText(
  requirements: string,
): Promise<LlmPolicyDraft> {
  const baseModel = env.ANTHROPIC_API_KEY
    ? createAnthropicModel()
    : env.OPENAI_API_KEY
      ? createOpenAiModel()
      : null;

  if (!baseModel) {
    throw new Error(
      "Natural-language createPolicy requires ANTHROPIC_API_KEY or OPENAI_API_KEY in .env",
    );
  }

  const structuredModel = baseModel.withStructuredOutput(llmPolicySchema, {
    name: "SplitPolicy",
    method: "jsonSchema",
  });

  const chain = policyPrompt.pipe(structuredModel);
  const result = await chain.invoke({ requirements });

  return llmPolicySchema.parse(result);
}
