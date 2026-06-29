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
  ensSubnames?: EnsSubnameProvision[];
  ensParent?: string;
  ensParentRegistration?: EnsParentRegistration;
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
