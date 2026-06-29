import { z } from "zod";
import { baseExplorerTx, env } from "../config.js";
import { ensureUserOrg, resolveUserOrg } from "./ens-org.js";
import { ensureSubname } from "./ens-subnames.js";
import { resolveAddressInput } from "./ens.js";
import type { CreateEnsDelivery } from "./types.js";

const subnameEntrySchema = z.object({
  subname: z.string().min(1),
  address: z.string().min(1),
});

const createEnsSchema = z.object({
  org: z.string().min(1),
  address: z.string().min(1),
  subname: z.string().min(1).optional(),
});

const createEnsBatchSchema = z.object({
  org: z.string().min(1),
  names: z.array(subnameEntrySchema).min(1),
});

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * createEnsName — user org (e.g. acme → acme.base.eth) + optional subnames.
 */
export async function createEnsFromRequirements(
  requirements: string,
): Promise<CreateEnsDelivery | { org: string; orgLabel: string; names: CreateEnsDelivery[] }> {
  const trimmed = requirements.trim();
  if (!trimmed) {
    throw new Error("createEnsName requirements cannot be empty");
  }

  const asJson = tryParseJson(trimmed);
  if (asJson === null) {
    throw new Error(
      'createEnsName requires JSON, e.g. { "org": "acme", "subname": "payroll", "address": "0x..." }',
    );
  }

  if (createEnsBatchSchema.safeParse(asJson).success) {
    const batch = createEnsBatchSchema.parse(asJson);
    const { label, domain } = resolveUserOrg(batch.org);
    const orgRegistration = await ensureUserOrg(batch.org);
    const names: CreateEnsDelivery[] = [];
    for (const item of batch.names) {
      names.push(
        await provisionSubname(domain, label, item.subname, item.address, orgRegistration),
      );
    }
    return { org: domain, orgLabel: label, names };
  }

  const single = createEnsSchema.parse(asJson);
  const { label, domain } = resolveUserOrg(single.org);
  const orgRegistration = await ensureUserOrg(single.org);

  if (!single.subname) {
    return provisionOrgRoot(domain, label, single.address, orgRegistration);
  }

  return provisionSubname(domain, label, single.subname, single.address, orgRegistration);
}

async function provisionOrgRoot(
  domain: string,
  orgLabel: string,
  addressInput: string,
  orgRegistration: Awaited<ReturnType<typeof ensureUserOrg>>,
): Promise<CreateEnsDelivery> {
  const { address } = await resolveAddressInput(addressInput);
  const txHash = orgRegistration.txHashes[0];

  return {
    org: domain,
    orgLabel,
    ens: domain,
    address,
    created: orgRegistration.registered,
    txHashes: orgRegistration.txHashes,
    orgRegistration,
    baseExplorer: txHash ? baseExplorerTx(txHash) : undefined,
    mock: env.DEV_MOCK_ENS_SUBNAMES || undefined,
  };
}

async function provisionSubname(
  domain: string,
  orgLabel: string,
  subname: string,
  addressInput: string,
  orgRegistration: Awaited<ReturnType<typeof ensureUserOrg>>,
): Promise<CreateEnsDelivery> {
  const { address } = await resolveAddressInput(addressInput);
  const result = await ensureSubname(subname, domain, address);
  const txHash = result.txHashes[0] ?? orgRegistration.txHashes[0];

  return {
    org: domain,
    orgLabel,
    subname,
    ens: result.ens,
    address: result.address,
    created: result.created,
    txHashes: [...orgRegistration.txHashes, ...result.txHashes],
    orgRegistration,
    baseExplorer: txHash ? baseExplorerTx(txHash) : undefined,
    mock: env.DEV_MOCK_ENS_SUBNAMES || undefined,
  };
}
