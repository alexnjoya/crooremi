export type EnsParentRegistration = {
  parent: string;
  label: string;
  registered: boolean;
  alreadyExisted: boolean;
  txHashes: string[];
  owner: `0x${string}`;
  durationYears: number;
  chain?: "base";
  mock?: boolean;
};

export type SplitRecipient = {
  address: `0x${string}`;
  label: string;
  bps: number;
  ens?: string;
  subname?: string;
};

export type SplitPolicy = {
  id: string;
  name: string;
  recipients: SplitRecipient[];
};

export type EnsSubnameProvision = {
  ens: string;
  address: `0x${string}`;
  created: boolean;
  txHashes: string[];
};

export type CreatePolicyDelivery = {
  policyId: string;
  policy: Omit<SplitPolicy, "id"> & { recipients: SplitRecipient[] };
  /** Sum of recipient bps (≤ 10000). */
  allocatedBps: number;
  /** Unallocated share when allocatedBps < 10000. */
  remainderBps: number;
  /** Set when remainderBps > 0 — explains funds left with payer. */
  remainderNote?: string;
  /** Ready-to-hire execution payloads — copy each step to USDC Split Execution. */
  executionGuide?: ExecutionGuide;
  /** Where this step fits in the 3-step Remifi flow. */
  journeyGuide?: PolicyJourneyGuide;
  ensSubnames?: EnsSubnameProvision[];
  ensParent?: string;
  ensParentRegistration?: EnsParentRegistration;
};

export type ExecuteRequirementsDirect = {
  policyId: string;
  recipient: {
    address: `0x${string}`;
    label: string;
    amount: string;
  };
};

export type ExecuteRequirementsByReference = {
  policyId: string;
  totalUsdc: string;
  recipient?: string;
  recipientIndex?: number;
  /** Inline snapshot if policy store miss (e.g. after Railway redeploy). */
  policy?: {
    recipients: Array<{
      address: `0x${string}`;
      label: string;
      bps: number;
    }>;
  };
};

export type ExecutionHireGuide = {
  step: number;
  service: "USDC Split Execution";
  /** Self-contained direct format — works without policy store lookup. */
  requirements: ExecuteRequirementsDirect;
  recipientAddress: `0x${string}`;
  amount: string;
  /** Flat service fee in 6-decimal USDC units (default 1.00 USDC). */
  serviceFeeUsdc: string;
  /** Principal + service fee the buyer pays for this hire. */
  estimatedPayUsdc: string;
};

export type ExecutionGuide = {
  totalUsdc: string;
  hires: ExecutionHireGuide[];
  note: string;
  remainderBps?: number;
};

/** Persisted policy record for execute-by-reference lookups. */
export type StoredPolicy = CreatePolicyDelivery & {
  createdAt: string;
};

export type CreateEnsDelivery = {
  org: string;
  orgLabel: string;
  subname?: string;
  ens: string;
  address: `0x${string}`;
  created: boolean;
  txHashes: string[];
  orgRegistration?: EnsParentRegistration;
  baseExplorer?: string;
  mock?: boolean;
};

export type CreateEnsBatchDelivery = {
  org: string;
  orgLabel: string;
  names: CreateEnsDelivery[];
};

export type JourneyNextStep = {
  step: number;
  service: string;
  requirements: Record<string, unknown>;
  note: string;
};

export type EnsJourneyGuide = {
  step: 1;
  flow: "ENS → Policy → Execution";
  nextStep: JourneyNextStep;
};

export type PolicyJourneyGuide = {
  step: 2;
  flow: "ENS → Policy → Execution";
  previousService: "ENS Payout Identity";
  nextService: "USDC Split Execution";
  note: string;
};

/** Single-recipient payout — CROO routes USDC at payOrder time. */
export type ExecutePayoutLeg = {
  policyId: string;
  recipient: {
    address: `0x${string}`;
    label: string;
    amount: string;
  };
};

export type ExecutePaymentDelivery = {
  policyId: string;
  totalUsdc: string;
  txHashes: string[];
  recipients: Array<{
    label: string;
    amount: string;
    txHash: string;
  }>;
  baseExplorer: string;
  settlement: "croo_direct";
};
