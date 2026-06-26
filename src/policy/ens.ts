import { createPublicClient, http, isAddress } from "viem";
import { normalize } from "viem/ens";
import { base, mainnet } from "viem/chains";
import { env } from "../config.js";

const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(
    env.ENS_RPC_URL ?? "https://ethereum.publicnode.com",
  ),
});

const baseEnsClient = createPublicClient({
  chain: base,
  transport: http(env.BASE_RPC_URL),
});

function looksLikeEns(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.endsWith(".eth") || lower.includes(".eth");
}

function isHexAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function normalizeHexAddress(value: string): `0x${string}` {
  return value.toLowerCase() as `0x${string}`;
}

function isBasename(value: string): boolean {
  return value.toLowerCase().endsWith(".base.eth");
}

async function forwardOnMainnet(name: string): Promise<`0x${string}` | null> {
  try {
    return await mainnetClient.getEnsAddress({ name });
  } catch {
    return null;
  }
}

async function forwardOnBase(name: string): Promise<`0x${string}` | null> {
  try {
    return await baseEnsClient.getEnsAddress({ name });
  } catch {
    return null;
  }
}

export async function reverseResolveAddress(
  address: `0x${string}`,
): Promise<string | undefined> {
  const normalized = normalizeHexAddress(address);

  const baseName = await baseEnsClient
    .getEnsName({ address: normalized })
    .catch(() => null);
  if (baseName) return baseName;

  const mainnetName = await mainnetClient
    .getEnsName({ address: normalized })
    .catch(() => null);
  return mainnetName ?? undefined;
}

export async function resolveAddressInput(
  raw: string,
): Promise<{ address: `0x${string}`; ens?: string }> {
  const trimmed = raw.trim();

  if (isHexAddress(trimmed)) {
    const address = normalizeHexAddress(trimmed);
    const ens = await reverseResolveAddress(address);
    return ens ? { address, ens } : { address };
  }

  if (isAddress(trimmed)) {
    const address = trimmed as `0x${string}`;
    const ens = await reverseResolveAddress(address);
    return ens ? { address, ens } : { address };
  }

  if (!looksLikeEns(trimmed)) {
    throw new Error(
      `Invalid recipient address "${raw}". Use a 0x address or ENS name (e.g. alex.eth, name.base.eth).`,
    );
  }

  const name = normalize(trimmed);

  let address =
    (await forwardOnMainnet(name)) ??
    (isBasename(name) ? await forwardOnBase(name) : null);

  if (!address && !isBasename(name)) {
    address = await forwardOnBase(name);
  }

  if (!address) {
    throw new Error(`ENS name not found: ${trimmed}`);
  }

  return { address, ens: trimmed };
}

export async function resolveRecipients<
  T extends { address: string; label: string; bps: number; ens?: string },
>(recipients: T[]): Promise<
  Array<{
    address: `0x${string}`;
    label: string;
    bps: number;
    ens?: string;
  }>
> {
  const resolved = [];
  for (const recipient of recipients) {
    const { address, ens } = await resolveAddressInput(recipient.address);
    resolved.push({
      address,
      label: recipient.label,
      bps: recipient.bps,
      ens: recipient.ens ?? ens,
    });
  }
  return resolved;
}
