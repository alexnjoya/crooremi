import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const envPath = resolve(repoRoot, ".env");
if (existsSync(envPath)) {
  loadEnv({ path: envPath, override: true });
}

const envSchema = z.object({
  CROO_API_URL: z.string().url().default("https://api.croo.network"),
  CROO_WS_URL: z.string().url().default("wss://api.croo.network/ws"),
  CROO_SDK_KEY: z.string().min(1, "CROO_SDK_KEY is required"),
  CROO_SERVICE_ID_CREATE_POLICY: z.string().optional(),
  CROO_SERVICE_ID_EXECUTE_PAYMENT: z.string().optional(),
  CROO_REQUESTER_SDK_KEY: z.string().optional(),
  CROO_TARGET_SERVICE_ID: z.string().optional(),
  BASE_RPC_URL: z.string().url().default("https://mainnet.base.org"),
  BASE_CHAIN_ID: z.coerce.number().default(8453),
  USDC_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .default("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"),
  PROVIDER_AA_WALLET_ADDRESS: z
    .string()
    .optional()
    .transform((value) => {
      if (!value || value.trim() === "") return undefined;
      if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
        throw new Error("PROVIDER_AA_WALLET_ADDRESS must be a valid 0x address");
      }
      return value as `0x${string}`;
    }),
  AGENT_WALLET_PRIVATE_KEY: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() !== "" ? value : undefined)),
  DEV_MOCK_SETTLEMENT: z
    .string()
    .optional()
    .transform((value) => value === "true" || value === "1"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  ENS_RPC_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment:\n${message}`);
  }
  return parsed.data;
}

export const env = parseEnv();

export function isExecutePaymentService(serviceId: string): boolean {
  return Boolean(
    env.CROO_SERVICE_ID_EXECUTE_PAYMENT &&
      serviceId === env.CROO_SERVICE_ID_EXECUTE_PAYMENT,
  );
}

export function isCreatePolicyService(serviceId: string): boolean {
  return Boolean(
    env.CROO_SERVICE_ID_CREATE_POLICY &&
      serviceId === env.CROO_SERVICE_ID_CREATE_POLICY,
  );
}

export const baseExplorerTx = (txHash: string) =>
  env.BASE_CHAIN_ID === 8453
    ? `https://basescan.org/tx/${txHash}`
    : `https://sepolia.basescan.org/tx/${txHash}`;
