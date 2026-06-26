export type SplitRecipient = {
  address: `0x${string}`;
  label: string;
  bps: number;
  ens?: string;
};

export type SplitPolicy = {
  id: string;
  name: string;
  recipients: SplitRecipient[];
};

export type CreatePolicyDelivery = {
  policyId: string;
  policy: Omit<SplitPolicy, "id"> & { recipients: SplitRecipient[] };
};

export type ExecutePaymentInput = {
  policyId: string;
  totalUsdc: string;
  policy: Omit<SplitPolicy, "id">;
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
};
