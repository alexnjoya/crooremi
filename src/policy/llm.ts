import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { env } from "../config.js";

const llmPolicySchema = z.object({
  name: z.string().describe("Short human-readable policy name"),
  recipients: z
    .array(
      z.object({
        address: z
          .string()
          .describe("Recipient 0x address or ENS name (e.g. alex.eth)"),
        label: z.string().describe("Role label: team, ops, treasury, etc."),
        bps: z
          .number()
          .int()
          .positive()
          .describe("Basis points; all recipients must sum to 10000"),
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
- Express percentages as basis points (bps). 100% = 10000 bps. 40% = 4000 bps.
- Recipients must sum to exactly 10000 bps.
- Keep addresses exactly as given (0x hex or ENS names like alex.eth).
- Use concise labels (team, ops, treasury, creator, etc.).`,
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
