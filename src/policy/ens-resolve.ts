import { createPublicClient, http, isAddress } from "viem";
import { normalize } from "viem/ens";
import { base, mainnet } from "viem/chains";
import { z } from "zod";
import { env } from "../config.js";
import { getBasenameRegistryOwner } from "./ens-register-base.js";

const MAX_QUERIES = 10;

const baseEnsClient = createPublicClient({
  chain: base,
  transport: http(env.BASE_RPC_URL),
});

const mainnetEnsClient = createPublicClient({
  chain: mainnet,
  transport: http(env.ETH_RPC_URL),
});

export type EnsResolveChain = "base" | "ethereum";
export type EnsResolveDirection = "forward" | "reverse";

export type EnsLookupResult = {
  input: string;
  direction: EnsResolveDirection;
  name?: string;
  address?: string;
  chain: EnsResolveChain;
  resolved: boolean;
  error?: string;
};

export type EnsResolveDelivery = {
  success: boolean;
  results: EnsLookupResult[];
};

type NormalizedQuery = {
  direction: EnsResolveDirection;
  value: string;
};

function isHexAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/i.test(value.trim());
}

function normalizeHexAddress(value: string): `0x${string}` {
  return value.trim().toLowerCase() as `0x${string}`;
}

function isBasename(value: string): boolean {
  return value.toLowerCase().endsWith(".base.eth");
}

function isEnsName(value: string): boolean {
  return value.includes(".") && !isHexAddress(value);
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseMaybeJsonArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === "string") {
    const parsed = tryParseJson(value.trim());
    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
  }
  return undefined;
}

const queryItemSchema = z
  .object({
    name: z.string().min(1).optional(),
    address: z.string().min(1).optional(),
  })
  .refine((item) => item.name !== undefined || item.address !== undefined, {
    message: "Each query needs name or address",
  });

const requirementsSchema = z.object({
  queries: z.union([z.array(queryItemSchema), z.string()]).optional(),
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  forward: z.union([z.array(z.string()), z.string()]).optional(),
  reverse: z.union([z.array(z.string()), z.string()]).optional(),
});

export function parseEnsResolveQueries(requirements: string): NormalizedQuery[] {
  const trimmed = requirements.trim();
  if (!trimmed) {
    throw new Error("ENS resolver requirements cannot be empty");
  }

  const asJson = tryParseJson(trimmed);
  if (asJson === null) {
    if (isEnsName(trimmed)) {
      return [{ direction: "forward", value: trimmed }];
    }
    if (isHexAddress(trimmed)) {
      return [{ direction: "reverse", value: normalizeHexAddress(trimmed) }];
    }
    throw new Error("ENS resolver requires Schema JSON input");
  }

  const parsed = requirementsSchema.safeParse(asJson);
  if (!parsed.success) {
    throw new Error(
      "ENS resolver requires queries, name, address, forward, or reverse",
    );
  }

  const input = parsed.data;
  const queries: NormalizedQuery[] = [];

  const queryItems = Array.isArray(input.queries)
    ? input.queries
    : input.queries
      ? (tryParseJson(String(input.queries)) as z.infer<typeof queryItemSchema>[] | null)
      : null;

  if (queryItems) {
    for (const item of queryItems) {
      const row = queryItemSchema.parse(item);
      if (row.name) {
        queries.push({ direction: "forward", value: row.name.trim() });
      } else if (row.address) {
        queries.push({
          direction: "reverse",
          value: normalizeHexAddress(row.address),
        });
      }
    }
  }

  if (input.name) {
    queries.push({ direction: "forward", value: input.name.trim() });
  }

  if (input.address) {
    queries.push({
      direction: "reverse",
      value: normalizeHexAddress(input.address),
    });
  }

  for (const name of parseMaybeJsonArray(input.forward) ?? []) {
    queries.push({ direction: "forward", value: name.trim() });
  }

  for (const address of parseMaybeJsonArray(input.reverse) ?? []) {
    queries.push({
      direction: "reverse",
      value: normalizeHexAddress(address),
    });
  }

  if (queries.length === 0) {
    throw new Error(
      "ENS resolver requires queries, name, address, forward, or reverse",
    );
  }

  if (queries.length > MAX_QUERIES) {
    throw new Error(`ENS resolver accepts at most ${MAX_QUERIES} lookups per hire`);
  }

  return queries;
}

async function forwardResolveName(name: string): Promise<EnsLookupResult> {
  const input = name.trim();
  const chain: EnsResolveChain = isBasename(input) ? "base" : "ethereum";

  try {
    const normalized = normalize(input);

    if (chain === "base") {
      const address = await baseEnsClient
        .getEnsAddress({ name: normalized })
        .catch(() => null);

      if (address) {
        return {
          input,
          direction: "forward",
          name: input,
          address,
          chain,
          resolved: true,
        };
      }

      const registryOwner = await getBasenameRegistryOwner(normalized);
      if (registryOwner) {
        return {
          input,
          direction: "forward",
          name: input,
          address: registryOwner,
          chain,
          resolved: true,
        };
      }

      return {
        input,
        direction: "forward",
        chain,
        resolved: false,
        error: `Base name not found: ${input}`,
      };
    }

    const address = await mainnetEnsClient
      .getEnsAddress({ name: normalized })
      .catch(() => null);

    if (address) {
      return {
        input,
        direction: "forward",
        name: input,
        address,
        chain,
        resolved: true,
      };
    }

    return {
      input,
      direction: "forward",
      chain,
      resolved: false,
      error: `ENS name not found: ${input}`,
    };
  } catch (err) {
    return {
      input,
      direction: "forward",
      chain,
      resolved: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function reverseResolveInput(addressInput: string): Promise<EnsLookupResult> {
  const input = normalizeHexAddress(addressInput);

  if (!isAddress(input)) {
    return {
      input: addressInput,
      direction: "reverse",
      chain: "base",
      resolved: false,
      error: `Invalid address: ${addressInput}`,
    };
  }

  try {
    const baseName = await baseEnsClient
      .getEnsName({ address: input })
      .catch(() => null);

    if (baseName) {
      return {
        input,
        direction: "reverse",
        name: baseName,
        address: input,
        chain: "base",
        resolved: true,
      };
    }

    const ethName = await mainnetEnsClient
      .getEnsName({ address: input })
      .catch(() => null);

    if (ethName) {
      return {
        input,
        direction: "reverse",
        name: ethName,
        address: input,
        chain: "ethereum",
        resolved: true,
      };
    }

    return {
      input,
      direction: "reverse",
      chain: "ethereum",
      resolved: false,
      error: "No primary ENS name found for this address",
    };
  } catch (err) {
    return {
      input,
      direction: "reverse",
      chain: "ethereum",
      resolved: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function resolveEnsFromRequirements(
  requirements: string,
): Promise<EnsResolveDelivery> {
  const queries = parseEnsResolveQueries(requirements);
  const results: EnsLookupResult[] = [];

  for (const query of queries) {
    if (query.direction === "forward") {
      if (!isEnsName(query.value)) {
        results.push({
          input: query.value,
          direction: "forward",
          chain: "base",
          resolved: false,
          error: "Forward lookup requires an ENS name",
        });
        continue;
      }
      results.push(await forwardResolveName(query.value));
      continue;
    }

    results.push(await reverseResolveInput(query.value));
  }

  return {
    success: results.every((row) => row.resolved),
    results,
  };
}
