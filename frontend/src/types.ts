export interface Campaign {
  id: number;
  creator: string;
  goal: bigint;
  pledged: bigint;
  startAt: bigint;
  endAt: bigint;
  claimed: boolean;
  metadataURI: string;
}

export interface Reward {
  title: string;
  description: string;
  minimumContribution: bigint;
  quantityAvailable: bigint;
  claimedCount: bigint;
}

export interface UserContribution {
  campaignId: number;
  campaign: Campaign;
  amount: bigint;
}
