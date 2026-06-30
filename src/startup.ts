import { env } from "./config.js";

type RequiredInProd = {
  key: keyof typeof env;
  hint: string;
};

const PRODUCTION_REQUIRED: RequiredInProd[] = [
  {
    key: "CROO_SERVICE_ID_CREATE_POLICY",
    hint: "Agent Store → createPolicy service ID",
  },
  {
    key: "CROO_SERVICE_ID_EXECUTE_PAYMENT",
    hint: "Agent Store → executePaymentJob service ID",
  },
  {
    key: "CROO_SERVICE_ID_CREATE_ENS",
    hint: "Agent Store → createEnsName service ID",
  },
  {
    key: "ENS_REGISTRAR_PRIVATE_KEY",
    hint: "Operator wallet — pays ENS registration gas on Base",
  },
];

export function validateStartup(): void {
  if (env.NODE_ENV !== "production") {
    console.log(`[remifi] starting in ${env.NODE_ENV} mode`);
    return;
  }

  const errors: string[] = [];

  if (env.DEV_MOCK_ENS_SUBNAMES) {
    errors.push("DEV_MOCK_ENS_SUBNAMES must be false in production");
  }

  for (const { key, hint } of PRODUCTION_REQUIRED) {
    const value = env[key];
    if (value === undefined || value === null || value === "") {
      errors.push(`${key} is required (${hint})`);
    }
  }

  if (!env.DATABASE_URL) {
    errors.push("DATABASE_URL is required (Neon Postgres — policy store for execution)");
  }

  if (errors.length > 0) {
    throw new Error(
      `Production startup blocked:\n${errors.map((e) => `  - ${e}`).join("\n")}`,
    );
  }

  console.log("[remifi] production env validated");
}

export function registerProcessHandlers(): void {
  process.on("unhandledRejection", (reason) => {
    console.error("[remifi] unhandled rejection:", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("[remifi] uncaught exception:", err);
    process.exit(1);
  });
}
