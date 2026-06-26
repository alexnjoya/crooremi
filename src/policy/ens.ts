import { createPublicClient, http, isAddress } from "viem";
import { normalize } from "viem/ens";
import { mainnet } from "viem/chains";

const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(
    process.env.ENS_RPC_URL ?? "https://ethereum.publicnode.com",
  ),
});

function looksLikeEns(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.endsWith(".eth") || lower.includes(".eth");
}

export async function resolveAddressInput(
  raw: string,
): Promise<{ address: `0x${string}`; ens?: string }> {
  const trimmed = raw.trim();

  if (isAddress(trimmed)) {
    return { address: trimmed as `0x${string}` };
  }

  if (!looksLikeEns(trimmed)) {
    throw new Error(
      `Invalid recipient address "${raw}". Use a 0x address or ENS name (e.g. alex.eth).`,
    );
  }

  const name = normalize(trimmed);
  const address = await ensClient.getEnsAddress({ name });
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
