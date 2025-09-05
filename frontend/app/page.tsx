"use client";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { getCrowdfundContract, getCrowdfundAddress, getCrowdfundReadContract } from "@/lib/web3";
import WalletConnect from "@/components/WalletConnect";
import CampaignCard from "@/components/CampaignCard";
import CreateCampaignModal from "@/components/CreateCampaignModal";
import CampaignDetailModal from "@/components/CampaignDetailModal";
import AddRewardModal from "@/components/AddRewardModal";
import { Toaster, toast } from "react-hot-toast";
import type { Campaign, Reward, UserContribution } from "@/types";

// Augment the contribution with a refunded flag for UI
type UIUserContribution = UserContribution & { refunded?: boolean };
// Basic user reward entry for UI
type UserRewardEntry = {
  campaignId: number;
  campaign?: Campaign;
  reward: Reward;
  // Optional helpers
  eligibleAmount?: bigint;
  claimed?: boolean;
  status: 'eligible' | 'missed' | 'claimed';
};

export default function Home() {
  const [userAccount, setUserAccount] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string>("0");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddRewardModalOpen, setIsAddRewardModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'campaigns' | 'my-contributions' | 'my-campaigns' | 'my-rewards'>('dashboard');
  const [userContributions, setUserContributions] = useState<UIUserContribution[]>([]);
  const [userCreatedCampaigns, setUserCreatedCampaigns] = useState<Campaign[]>([]);
  const [userRewards, setUserRewards] = useState<UserRewardEntry[]>([]);
  const [totalContributed, setTotalContributed] = useState<bigint>(0n);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{chainId: string, name: string} | null>(null);

  // Keep last known non-zero pledged to show after creator claims (if contract zeroes it)
  const [lastKnownPledged, setLastKnownPledged] = useState<Record<number, bigint>>({});

  // Initialize time only on client side to prevent hydration errors
  useEffect(() => {
    setCurrentTime(Math.floor(Date.now() / 1000));
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load campaigns on mount and when account or tab changes
  useEffect(() => {
    if (userAccount) {
      loadCampaigns();
    }
  }, [userAccount, activeTab]);

  // Load user data after campaigns are loaded
  useEffect(() => {
    if (userAccount) {
      loadUserData();
    }
  }, [userAccount, activeTab]);

  async function loadCampaigns() {
    setIsLoading(true);
    try {
      const contract = await getCrowdfundReadContract();
      if (!contract) return;

      const campaignCount = await contract.campaignCount();
      const loadedCampaigns: Campaign[] = [];
      const newLastKnown = { ...lastKnownPledged };

      for (let i = 1; i <= Number(campaignCount); i++) {
        try {
          const campaign = await contract.campaigns(i);
          // Track last known non-zero pledged so we can display it even after claim
          if (campaign.pledged && campaign.pledged > 0n) {
            newLastKnown[i] = campaign.pledged;
          }
          const effectivePledged =
            (campaign.pledged === 0n && campaign.claimed && newLastKnown[i] && newLastKnown[i] > 0n)
              ? newLastKnown[i]
              : campaign.pledged;

          const campaignData = {
            id: i,
            creator: campaign.creator,
            goal: campaign.goal,
            pledged: effectivePledged,
            startAt: campaign.startAt,
            endAt: campaign.endAt,
            claimed: campaign.claimed,
            metadataURI: campaign.metadataURI,
          };

          // Filter campaigns based on context:
          // 1. For "Browse Campaigns" - show all campaigns (upcoming, active, and ended)
          // 2. For "My Campaigns" - show all campaigns created by the current user
          // 3. For other contexts - show all campaigns
          if (activeTab === 'campaigns') {
            // Show all campaigns in browse section (upcoming, active, ended)
            loadedCampaigns.push(campaignData);
          } else if (activeTab === 'my-campaigns') {
            // Only show campaigns created by current user
            if (userAccount && campaignData.creator.toLowerCase() === userAccount.toLowerCase()) {
              loadedCampaigns.push(campaignData);
            }
          } else {
            // For dashboard and other contexts, show all campaigns
            loadedCampaigns.push(campaignData);
          }
        } catch (error) {
          console.error(`Failed to load campaign ${i}:`, error);
        }
      }

      setLastKnownPledged(newLastKnown);
      setCampaigns(loadedCampaigns);
    } catch (error) {
      console.error("Failed to load campaigns:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Helper: best-effort check if a user has refunded for a given campaign
  async function hasUserRefunded(contract: any, campaignId: number, user: string): Promise<boolean> {
    try {
      if (typeof contract.hasRefunded === 'function') {
        return await contract.hasRefunded(campaignId, user);
      }
    } catch {}
    try {
      if (typeof contract.refunded === 'function') {
        return await contract.refunded(campaignId, user);
      }
    } catch {}
    // Fallback heuristic: if campaign failed and on-chain contribution is 0
    try {
      const contrib: bigint = await contract.getUserContribution(campaignId, user);
      return contrib === 0n;
    } catch {}
    return false;
  }

  // Load all campaigns for user data processing (not filtered by tab)
  async function loadAllCampaigns(): Promise<Campaign[]> {
    try {
      const contract = await getCrowdfundReadContract();
      if (!contract) return [];

      const campaignCount = await contract.campaignCount();
      const allCampaigns: Campaign[] = [];

      for (let i = 1; i <= Number(campaignCount); i++) {
        try {
          const campaign = await contract.campaigns(i);
          const effectivePledged =
            (campaign.pledged === 0n && campaign.claimed && lastKnownPledged[i] && lastKnownPledged[i] > 0n)
              ? lastKnownPledged[i]
              : campaign.pledged;

          allCampaigns.push({
            id: i,
            creator: campaign.creator,
            goal: campaign.goal,
            pledged: effectivePledged,
            startAt: campaign.startAt,
            endAt: campaign.endAt,
            claimed: campaign.claimed,
            metadataURI: campaign.metadataURI,
          });
        } catch (error) {
          console.error(`Failed to load campaign ${i}:`, error);
        }
      }

      return allCampaigns;
    } catch (error) {
      console.error("Failed to load all campaigns:", error);
      return [];
    }
  }

  const loadUserData = useCallback(async () => {
    if (!userAccount || typeof userAccount !== 'string') return;
    
    setIsLoadingUserData(true);
    
    try {
      const contract: any = await getCrowdfundReadContract();
      if (!contract) return;

      // Load all campaigns for user data processing
      const allCampaigns = await loadAllCampaigns();

      // Load total contributed
      const total = await contract.totalContributed(userAccount);
      setTotalContributed(total);

      // Load user contributions and created campaigns
      const contributions: UIUserContribution[] = [];
      const created: Campaign[] = [];

      for (const campaign of allCampaigns) {
        const contribution: bigint = await contract.getUserContribution(campaign.id, userAccount);

        // Only process campaigns where the user actually contributed
        if (contribution > 0n) {
          // Determine if the campaign failed
          const isFailed = (Number(campaign.endAt) <= currentTime) && (campaign.pledged < campaign.goal);
          // Determine if the user has refunded (only if campaign failed and user contributed)
          const refunded = isFailed ? await hasUserRefunded(contract, campaign.id, userAccount) : false;

          contributions.push({
            campaignId: campaign.id,
            campaign,
            amount: contribution,
            refunded,
          });
        }

        if (campaign.creator.toLowerCase() === userAccount.toLowerCase()) {
          created.push(campaign);
        }
      }

      setUserContributions(contributions);
      setUserCreatedCampaigns(created);

      // Load "My Rewards"
      const rewards: UserRewardEntry[] = [];
      
      // Process rewards based on user contributions and campaign status
      for (const uc of contributions) {
        if (!uc.campaign) continue;
        const cid = uc.campaign.id;
        let campaignRewards: Reward[] | null = null;

        // Try to get campaign rewards
        try {
          if (typeof contract.getRewards === 'function') {
            campaignRewards = await contract.getRewards(cid);
          }
        } catch {}
        if (!campaignRewards) {
          try {
            if (typeof contract.getCampaignRewards === 'function') {
              campaignRewards = await contract.getCampaignRewards(cid);
            }
          } catch {}
        }

        if (Array.isArray(campaignRewards)) {
          for (const rw of campaignRewards) {
            // Check if user meets the minimum contribution threshold
            const threshold = (rw as any).minContribution ?? (rw as any).minimumContribution ?? 0n;
            const minContrib = typeof threshold === 'bigint' ? threshold : BigInt(threshold.toString?.() ?? threshold);
            
            if (uc.amount >= minContrib) {
              // Determine reward status based on campaign and user state
              let rewardStatus: 'eligible' | 'missed' | 'claimed' = 'eligible';
              let claimed = false;
              
              // Check if user has already claimed this reward
              try {
                if (typeof contract.isRewardClaimed === 'function') {
                  claimed = await contract.isRewardClaimed(cid, (rw as any).id ?? 0, userAccount);
                } else if (typeof contract.rewardClaimed === 'function') {
                  claimed = await contract.rewardClaimed(cid, (rw as any).id ?? 0, userAccount);
                }
              } catch {}
              
              if (claimed) {
                rewardStatus = 'claimed';
              } else if (uc.refunded) {
                // User refunded their contribution, so they missed the reward
                rewardStatus = 'missed';
              } else if (uc.campaign.claimed) {
                // Campaign succeeded and creator withdrew, reward is claimable
                rewardStatus = 'eligible';
              } else if (Number(uc.campaign.endAt) <= currentTime && uc.campaign.pledged < uc.campaign.goal) {
                // Campaign failed, user should have refunded
                rewardStatus = 'missed';
              }
              
              rewards.push({
                campaignId: cid,
                campaign: uc.campaign,
                reward: rw,
                eligibleAmount: uc.amount,
                claimed,
                status: rewardStatus,
              });
            }
          }
        }
      }

      setUserRewards(rewards);
    } catch (error) {
      console.error("Failed to load user data:", error);
    } finally {
      setIsLoadingUserData(false);
    }
  }, [userAccount, campaigns, currentTime]);

  function getCampaignStatus(campaign: Campaign, time: number): 'upcoming' | 'active' | 'success' | 'failed' {
    if (time < Number(campaign.startAt)) return 'upcoming';
    if (time < Number(campaign.endAt)) return 'active';
    if (campaign.pledged >= campaign.goal) return 'success';
    return 'failed';
  }

   // Creator-side status: show "Claimed" if withdrawn
  function getCreatorStatus(campaign: Campaign, time: number): 'claimed' | 'upcoming' | 'active' | 'success' | 'failed' {
    if (campaign.claimed) return 'claimed';
    return getCampaignStatus(campaign, time);
  }

  // Contributor-side status with "Done" and "Refunded"
  function getContributorStatus(entry: UIUserContribution, time: number): 'done' | 'refunded' | 'upcoming' | 'active' | 'success' | 'failed' {
    const c = entry.campaign;
    if (!c) return 'failed';
    if (c.claimed) return 'done';
    const base = getCampaignStatus(c, time);
    if (base === 'failed' && entry.refunded) return 'refunded';
    return base;
  }

  // Countdown utility functions
  function getTimeRemaining(targetTime: number): { days: number; hours: number; minutes: number; seconds: number; total: number } {
    const total = Math.max(0, targetTime - currentTime);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return { days, hours, minutes, seconds, total };
  }

  function formatCountdown(targetTime: number): string {
    const { days, hours, minutes, seconds, total } = getTimeRemaining(targetTime);
    
    if (total <= 0) return "Ended";
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  async function handleCreateCampaign(goal: bigint, startAt: number, endAt: number, metadataURI: string) {
    try {
      const contract = await getCrowdfundContract();
      if (!contract) {
        throw new Error("Contract not available - please check if contract is deployed and wallet is connected");
      }
      // Preflight: estimate gas to catch reverts early with clearer reason
      try {
        await contract.createCampaign.estimateGas(goal, startAt, endAt, metadataURI);
      } catch (err: any) {
        const msg = err?.shortMessage || err?.info?.error?.message || err?.message || 'Transaction would fail';
        throw new Error(msg);
      }

      const tx = await contract.createCampaign(goal, startAt, endAt, metadataURI);
      await tx.wait();

      // Give the chain a moment, then refresh and switch to My Campaigns for visibility
      await new Promise(r => setTimeout(r, 800));
      await loadCampaigns();
      await loadUserData();
      setActiveTab('my-campaigns');
      
      toast.success("Campaign created successfully!");
    } catch (error: any) {
      toast.error(error?.message || "Failed to create campaign");
    }
  }

  async function handleAddReward(campaignId: number, title: string, description: string, minContribution: bigint, quantity: bigint) {
    try {
      const contract = await getCrowdfundContract();
      if (!contract) throw new Error("Contract not available");

      const tx = await contract.addReward(campaignId, title, description, minContribution, quantity);
      await tx.wait();

      toast.success("Reward added successfully!");
      setIsAddRewardModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to add reward");
    }
  }

  // Note: Rewards are automatically claimed when pledging with a reward index
  // There's no separate claimReward function in the contract
  async function handleClaimReward(campaignId: number, reward: Reward) {
    // Update the reward status to 'claimed' in the userRewards array
    // Match by campaignId and reward properties since rewards don't have unique IDs
    setUserRewards(prevRewards => 
      prevRewards.map(ur => 
        ur.campaignId === campaignId && 
        ur.reward.title === reward.title &&
        ur.reward.minimumContribution === reward.minimumContribution
          ? { ...ur, status: 'claimed' as const }
          : ur
      )
    );
    toast.success("Reward claimed!");
  }

  function handleCampaignSelect(campaign: Campaign) {
    setSelectedCampaign(campaign);
    setIsDetailModalOpen(true);
  }

  function handleWalletConnect(account: string, balance: string) {
    console.log("Connecting wallet:", account, typeof account);
    setUserAccount(account);
    setUserBalance(balance);
  }

  function handleWalletDisconnect() {
    setUserAccount(null);
    setUserBalance("0");
    setCampaigns([]);
    setUserContributions([]);
    setUserCreatedCampaigns([]);
    setUserRewards([]);
    setTotalContributed(0n);
    setSidebarOpen(false);
    setLastKnownPledged({});
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {userAccount && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              )}
              <div className="ml-2 lg:ml-0">
                <h1 className="text-xl font-semibold text-black">Crowdfunding dApp</h1>
                <p className="text-sm text-blue-600 font-medium">Donate, Bring Ideas and Get Funded</p>
              </div>
            </div>
            <WalletConnect onConnect={handleWalletConnect} onDisconnect={handleWalletDisconnect} />
          </div>
        </div>
      </header>

    <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        {userAccount && (
          <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:transition-none lg:sticky lg:top-16 lg:inset-auto lg:h-[calc(100vh-4rem)]`}>
          <div className="h-full flex flex-col">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <nav className="mt-5 flex-1 px-2 space-y-1">
                  {/* Dashboard */}
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`w-full text-left group flex items-center px-2 py-2 text-sm font-medium border-r-4 transition-colors ${
                      activeTab === 'dashboard' 
                        ? 'bg-indigo-100 border-indigo-500 text-indigo-700' 
                        : 'border-transparent text-black hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900'
                    }`}
                  >
                    <svg className="mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    </svg>
                    Dashboard
                  </button>

                  {/* Browse Campaigns */}
                <button
                  onClick={() => setActiveTab('campaigns')}
                  className={`w-full text-left group flex items-center px-2 py-2 text-sm font-medium border-r-4 transition-colors ${
                    activeTab === 'campaigns' 
                      ? 'bg-indigo-100 border-indigo-500 text-indigo-700' 
                      : 'border-transparent text-black hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900'
                  }`}
                >
                  <svg className="mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Browse Campaigns
                </button>

                  {/* My Contributions */}
                  <button
                    onClick={() => setActiveTab('my-contributions')}
                                      className={`w-full text-left group flex items-center px-2 py-2 text-sm font-medium border-r-4 transition-colors ${
                    activeTab === 'my-contributions' 
                      ? 'bg-indigo-100 border-indigo-500 text-indigo-700' 
                      : 'border-transparent text-black hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900'
                  }`}
                  >
                    <svg className="mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    My Contributions
                    {userContributions.length > 0 && (
                      <span className="ml-auto bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-full">
                        {userContributions.length}
                      </span>
                    )}
                  </button>

                  {/* My Campaigns */}
                  <button
                    onClick={() => setActiveTab('my-campaigns')}
                                      className={`w-full text-left group flex items-center px-2 py-2 text-sm font-medium border-r-4 transition-colors ${
                    activeTab === 'my-campaigns' 
                      ? 'bg-indigo-100 border-indigo-500 text-indigo-700' 
                      : 'border-transparent text-black hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900'
                  }`}
                  >
                    <svg className="mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    My Campaigns
                    {userCreatedCampaigns.length > 0 && (
                      <span className="ml-auto bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                        {userCreatedCampaigns.length}
                      </span>
                    )}
                  </button>

                  {/* My Rewards */}
                <button
                    onClick={() => setActiveTab('my-rewards')}
                  className={`w-full text-left group flex items-center px-2 py-2 text-sm font-medium border-r-4 transition-colors ${
                    activeTab === 'my-rewards' 
                      ? 'bg-indigo-100 border-indigo-500 text-indigo-700' 
                      : 'border-transparent text-black hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900'
                  }`}
                >
                  <svg className="mr-3 flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2-2 4 4M7 7h10M7 11h6" />
                  </svg>
                    My Rewards
                    {userRewards.length > 0 && (
                      <span className="ml-auto bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                        {userRewards.length}
                      </span>
                    )}
                </button>

                  {/* Create Campaign */}
                  <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full text-left border-transparent text-black hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium border-r-4"
                >
                  <svg className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Campaign
                </button>
                  </div>
              </nav>
            </div>
          </div>
        </div>
        )}

        {/* Main Content */}
        <div className="flex-1">
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {/* Welcome Section */}
            {!userAccount ? (
              <div className="text-center py-12">
                <h2 className="text-3xl font-bold text-black-900 mb-4">Welcome to Crowdfund dApp</h2>
                <p className="text-lg text-black mb-5">Connect your MetaMask wallet to start creating and funding campaigns</p>
                <WalletConnect onConnect={handleWalletConnect} onDisconnect={handleWalletDisconnect} />
              </div>
            ) : (
              <div className="space-y-6">
                {/* User Info & Actions (Dashboard only) */}
                {activeTab === 'dashboard' && userAccount && typeof userAccount === 'string' && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                      <h2 className="text-lg font-medium text-black">Welcome back!</h2>
                      <p className="text-sm text-black">
                          Account: {userAccount.slice(0, 6)}...{userAccount.slice(-4)} | 
                          Balance: {parseFloat(userBalance).toFixed(4)} ETH
                        </p>
                      </div>
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Create Campaign
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab Content */}
                {userAccount ? (
                  activeTab === 'dashboard' ? (
                    /* Dashboard */
                    <div className="space-y-6">
                      {/* Dashboard Header */}
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xl font-semibold text-black">
                            User Dashboard <span className="text-gray-500">(Wallet: {userAccount && typeof userAccount === 'string' ? `${userAccount.slice(0, 6)}...${userAccount.slice(-4)}` : 'Unknown'})</span>
                          </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="text-sm text-blue-600 font-medium">Total Contributed</div>
                            <div className="text-2xl font-bold text-blue-900">
                              {ethers.formatEther(totalContributed)} ETH
                            </div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-4">
                            <div className="text-sm text-green-600 font-medium">Campaigns Participated</div>
                            <div className="text-2xl font-bold text-green-900">{userContributions.length}</div>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-4">
                            <div className="text-sm text-purple-600 font-medium">Campaigns Created</div>
                            <div className="text-2xl font-bold text-purple-900">{userCreatedCampaigns.length}</div>
                          </div>
                          <div className="bg-yellow-50 rounded-lg p-4">
                            <div className="text-sm text-yellow-600 font-medium">Active Campaigns to Contribute</div>
                            <div className="text-2xl font-bold text-yellow-900">
                              {campaigns.filter(c => currentTime >= Number(c.startAt) && currentTime < Number(c.endAt)).length}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recent Activity */}
                      <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-medium text-black">Recent Activity</h3>
                        </div>
                        <div className="p-6">
                          <div className="space-y-4">
                            {userContributions.slice(0, 3).map((contribution) => {
                              const status = getContributorStatus(contribution, currentTime);
                              return (
                                <div key={contribution.campaignId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div>
                                    <p className="font-medium text-black">Contributed to Campaign #{contribution.campaignId}</p>
                                    <p className="text-sm text-black">{ethers.formatEther(contribution.amount)} ETH</p>
                                  </div>
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    status === 'done' ? 'bg-green-100 text-green-800' :
                                    status === 'refunded' ? 'bg-yellow-100 text-yellow-800' :
                                    status === 'success' ? 'bg-blue-100 text-blue-800' :
                                    status === 'failed' ? 'bg-red-100 text-red-800' :
                                    status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-indigo-100 text-indigo-800'
                                  }`}>
                                    {status === 'done' ? 'Funded' :
                                     status === 'refunded' ? 'Refunded' :
                                     status === 'success' ? 'Success' :
                                     status === 'failed' ? 'Failed' :
                                     status === 'upcoming' ? 'Not Started' :
                                     'Active'}
                                  </span>
                                </div>
                              );
                            })}
                            {userContributions.length === 0 && (
                              <p className="text-black text-center">No recent activity</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : activeTab === 'campaigns' ? (
                  /* Campaigns Grid */
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-black">All Campaigns</h3>
                      <button
                        onClick={loadCampaigns}
                        disabled={isLoading}
                        className="px-3 py-1 text-sm bg-blue-500 text-white-700 rounded-md hover:bg-blue-600 disabled:opacity-50"
                      >
                        {isLoading ? "Loading..." : "⟳ Refresh"}
                      </button>
                    </div>

                    {campaigns.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-lg shadow">
                        <p className="text-black">No campaigns found. Create the first one!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {campaigns.map((campaign) => (
                          <CampaignCard
                            key={campaign.id}
                            campaign={campaign}
                            currentTime={currentTime}
                            onSelect={handleCampaignSelect}
                              userAddress={userAccount && typeof userAccount === 'string' ? userAccount : undefined}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  ) : activeTab === 'my-contributions' ? (
                    /* My Contributions */
                  <div className="space-y-6">
                      <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-medium text-black">My Contributions</h3>
                      </div>
                      <div className="overflow-x-auto">
                        {isLoadingUserData ? (
                          <div className="p-6 text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                              <span className="text-black">Loading contributions...</span>
                          </div>
                        ) : (
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Campaign</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Goal</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Pledged</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">My Contribution</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {userContributions.map((contribution) => {
                                  const status = getContributorStatus(contribution, currentTime);
                                  return (
                                <tr key={contribution.campaignId}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                                    #{contribution.campaignId}
                                  </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                                    {ethers.formatEther(contribution.campaign.goal)} ETH
                                  </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                                    {ethers.formatEther(contribution.campaign.pledged)} ETH
                                  </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                                    {ethers.formatEther(contribution.amount)} ETH
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                          status === 'done' ? 'bg-green-100 text-green-800' :
                                          status === 'refunded' ? 'bg-yellow-100 text-yellow-800' :
                                          status === 'success' ? 'bg-blue-100 text-blue-800' :
                                          status === 'failed' ? 'bg-red-100 text-red-800' :
                                          status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-indigo-100 text-indigo-800'
                                        }`}>
                                          {status === 'done' ? 'Funded' :
                                           status === 'refunded' ? 'Refunded' :
                                           status === 'success' ? 'Success' :
                                           status === 'failed' ? 'Failed' :
                                           status === 'upcoming' ? 'Not Started' :
                                     'Active'}
                                    </span>
                                  </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                                    <button
                                      onClick={() => handleCampaignSelect(contribution.campaign)}
                                      className="text-indigo-600 hover:text-indigo-900"
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                                  );
                                })}
                              {userContributions.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                    No contributions yet
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                    </div>
                  ) : activeTab === 'my-campaigns' ? (
                    /* My Campaigns */
                    <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-lg font-medium text-black">
                          My Created Campaigns (Total: {userCreatedCampaigns.length})
                        </h3>
                          <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                          >
                            Create New Campaign
                          </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Campaign</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Goal</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Pledged</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                              {userCreatedCampaigns.map((campaign) => {
                                const status = getCreatorStatus(campaign, currentTime);
                                return (
                              <tr key={campaign.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                                  #{campaign.id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                                  {ethers.formatEther(campaign.goal)} ETH
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                                  {ethers.formatEther(campaign.pledged)} ETH
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        status === 'claimed' ? 'bg-green-100 text-green-800' :
                                        status === 'success' ? 'bg-blue-100 text-blue-800' :
                                        status === 'failed' ? 'bg-red-100 text-red-800' :
                                        status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-indigo-100 text-indigo-800'
                                      }`}>
                                        {status === 'claimed' ? 'Claimed' :
                                         status === 'success' ? 'Success' :
                                         status === 'failed' ? 'Failed' :
                                         status === 'upcoming' ? 'Not Started' :
                                         'Active'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => handleCampaignSelect(campaign)}
                                      className="text-indigo-600 hover:text-indigo-900"
                                    >
                                      View
                                    </button>
                                    {currentTime < Number(campaign.startAt) && (
                                      <button
                                        onClick={() => {
                                          setSelectedCampaign(campaign);
                                          setIsAddRewardModalOpen(true);
                                        }}
                                        className="text-green-600 hover:text-green-900"
                                      >
                                        Add Reward
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                                );
                              })}
                            {userCreatedCampaigns.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-sm text-black">
                                  No campaigns created yet
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  ) : activeTab === 'my-rewards' ? (
                    /* My Rewards */
                    <div className="space-y-6">
                      <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-medium text-black">My Rewards</h3>
                        </div>
                        <div className="p-4">
                          {isLoadingUserData ? (
                            <div className="p-6 text-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                              <span className="text-black">Loading rewards...</span>
                            </div>
                          ) : userRewards.length === 0 ? (
                            <div className="text-center text-black py-8">No rewards yet</div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {userRewards.map((ur, idx) => (
                                <div key={`${ur.campaignId}-${ur.reward.title}-${ur.reward.minimumContribution}-${idx}`} className="border rounded-lg p-4 bg-gray-50">
                                  <div className="text-sm text-black mb-1">Campaign #{ur.campaignId}</div>
                                  <div className="font-semibold text-black">{ur.reward.title}</div>
                                  <div className="text-sm text-black mt-1">
                                    {ur.reward.description}
                                  </div>
                                  <div className="text-xs text-black mt-2">
                                    Min Contribution: {ethers.formatEther(ur.reward.minimumContribution)} ETH
                                  </div>
                                  <div className="text-xs text-black mt-1">
                                    My Contribution: {ethers.formatEther(ur.eligibleAmount ?? 0n)} ETH
                                  </div>
                                  <div className="mt-2 flex items-center justify-between">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      ur.status === 'claimed' ? 'bg-green-100 text-green-800' :
                                      ur.status === 'missed' ? 'bg-red-100 text-red-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {ur.status === 'claimed' ? 'Claimed' :
                                       ur.status === 'missed' ? 'Missed due to project goal not met' :
                                       'Eligible'}
                                    </span>
                                    {ur.status === 'eligible' && ur.campaign?.claimed && (
                                      <button
                                        onClick={() => handleClaimReward(ur.campaignId, ur.reward)}
                                        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                                      >
                                        Claim Reward
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null
                ) : (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                      <p className="text-black">Please connect your wallet to view dashboard</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Modals */}
      <CreateCampaignModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateCampaign}
      />

      <AddRewardModal
        isOpen={isAddRewardModalOpen}
        onClose={() => setIsAddRewardModalOpen(false)}
        campaign={selectedCampaign}
        onAddReward={handleAddReward}
      />

      <CampaignDetailModal
        campaign={selectedCampaign}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCampaign(null);
        }}
        currentTime={currentTime}
        userAddress={userAccount && typeof userAccount === 'string' ? userAccount : undefined}
        onRefresh={() => {
          loadCampaigns();
          loadUserData();
        }}
      />

      {/* Mobile sidebar overlay */}
  {userAccount && sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Toaster />
    </div>
  );
}
