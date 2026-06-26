import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
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

function createChatModel(): BaseChatModel {
  if (env.ANTHROPIC_API_KEY) {
    return new ChatAnthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      model: "claude-sonnet-4-20250514",
      temperature: 0,
    });
  }

  if (env.OPENAI_API_KEY) {
    return new ChatOpenAI({
      apiKey: env.OPENAI_API_KEY,
      model: "gpt-4o-mini",
      temperature: 0,
    });
  }

  throw new Error(
    "Natural-language createPolicy requires ANTHROPIC_API_KEY or OPENAI_API_KEY in .env",
  );
}

export async function interpretPolicyText(
  requirements: string,
): Promise<LlmPolicyDraft> {
  const model = createChatModel().withStructuredOutput(llmPolicySchema);

  const result = await model.invoke([
    {
      role: "system",
      content: `You convert payment split instructions into structured split policies.
Rules:
- Express percentages as basis points (bps). 100% = 10000 bps. 40% = 4000 bps.
- Recipients must sum to exactly 10000 bps.
- Keep addresses exactly as given (0x hex or ENS names like alex.eth).
- Use concise labels (team, ops, treasury, creator, etc.).
- Return only the structured fields; no commentary.`,
    },
    {
      role: "user",
      content: requirements,
    },
  ]);

  return llmPolicySchema.parse(result);
}
