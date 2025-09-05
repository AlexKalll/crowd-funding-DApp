import { useState, useEffect } from "react";
import { getUserDisplayName } from "@/utils/userMapping";
import { ethers } from "ethers";
import { getCrowdfundContract, getCrowdfundReadContract } from "@/lib/web3";
import { toast } from "react-hot-toast";
import type { Campaign, Reward } from "@/types";

interface CampaignDetailModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
  currentTime: number;
  userAddress?: string;
  onRefresh: () => void;
}

export default function CampaignDetailModal({ 
  campaign, 
  isOpen, 
  onClose, 
  currentTime, 
  userAddress,
  onRefresh 
}: CampaignDetailModalProps) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [contributionAmount, setContributionAmount] = useState("");
  const [selectedReward, setSelectedReward] = useState<number>(-1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userContribution, setUserContribution] = useState<bigint>(0n);

  useEffect(() => {
    if (campaign && isOpen) {
      loadRewards();
      loadUserContribution();
    }
  }, [campaign, isOpen, loadRewards, loadUserContribution]);

  async function loadRewards() {
    if (!campaign) return;
    try {
  const contract = await getCrowdfundReadContract();
      if (contract) {
        const campaignRewards = await contract.getRewards(campaign.id);
        setRewards(campaignRewards);
      }
  } catch {}
  }

  async function loadUserContribution() {
    if (!campaign || !userAddress) return;
    try {
  const contract = await getCrowdfundReadContract();
      if (contract) {
        const contribution = await contract.getUserContribution(campaign.id, userAddress);
        setUserContribution(contribution);
      }
  } catch {}
  }

  async function handlePledge() {
    if (!campaign || !contributionAmount) return;
    
    setIsSubmitting(true);
    try {
      const contract = await getCrowdfundContract();
      if (!contract) throw new Error("Contract not available");
      
      const amount = ethers.parseEther(contributionAmount);
      // Client-side checks to mirror contract constraints
      if (selectedReward >= 0 && rewards[selectedReward]) {
        const r = rewards[selectedReward];
        if (amount < r.minimumContribution) {
          throw new Error("Contribution below reward minimum");
        }
        if (r.quantityAvailable > 0n && r.claimedCount >= r.quantityAvailable) {
          throw new Error("Reward sold out");
        }
      }
      const rewardIndex = selectedReward >= 0 ? selectedReward : Number.MAX_SAFE_INTEGER; // any large index => treated as no reward
      
      const tx = await contract.pledge(campaign.id, rewardIndex, { value: amount });
      await tx.wait();
      
      setContributionAmount("");
      setSelectedReward(-1);
      onRefresh();
  onClose();
      toast.success("Contribution successful!");
    } catch (error: any) {
      toast.error(error.message || "Failed to contribute");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleWithdraw() {
    if (!campaign) return;
    
    setIsSubmitting(true);
    try {
      const contract = await getCrowdfundContract();
      if (!contract) throw new Error("Contract not available");
      
      const tx = await contract.withdraw(campaign.id);
      await tx.wait();
      
      onRefresh();
  onClose();
      toast.success("Withdrawal successful!");
    } catch (error: any) {
      toast.error(error.message || "Failed to withdraw");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRefund() {
    if (!campaign) return;
    
    setIsSubmitting(true);
    try {
      const contract = await getCrowdfundContract();
      if (!contract) throw new Error("Contract not available");
      
      const tx = await contract.refund(campaign.id);
      await tx.wait();
      
      onRefresh();
      toast.success("Refund successful!");
    } catch (error: any) {
      toast.error(error.message || "Failed to refund");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen || !campaign) return null;

  const isNotStarted = currentTime < Number(campaign.startAt);
  const isActive = currentTime >= Number(campaign.startAt) && currentTime <= Number(campaign.endAt);
  const isEnded = currentTime > Number(campaign.endAt);
  const isGoalMet = campaign.pledged >= campaign.goal;
  const isCreator = userAddress && typeof userAddress === 'string' && 
    userAddress.toLowerCase() === campaign.creator.toLowerCase();
  const progress = Number(campaign.pledged) / Number(campaign.goal);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
                             <h2 className="text-2xl font-bold text-black">Campaign {campaign.id}</h2>
              {campaign.metadataURI && (
                <div className="mt-2">
                  {campaign.metadataURI.startsWith('http') ? (
                                         <a 
                       href={campaign.metadataURI} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-indigo-600 hover:text-indigo-800 underline text-lg break-all font-bold bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors inline-block"
                     >
                      Click Here to View the Project Detail.
                     </a>
                  ) : (
                                         <p className="text-lg text-black font-medium leading-relaxed">
                       {campaign.metadataURI}
                     </p>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Campaign Info */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                                 <h3 className="text-lg font-semibold mb-3 text-black">Campaign Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                                         <span className="text-black font-bold">Goal:</span>
                     <span className="font-bold text-black">{ethers.formatEther(campaign.goal)} ETH</span>
                  </div>
                  <div className="flex justify-between">
                                         <span className="text-black font-bold">Pledged:</span>
                     <span className="font-bold text-black">{ethers.formatEther(campaign.pledged)} ETH</span>
                  </div>
                  <div className="flex justify-between">
                                         <span className="text-black font-bold">Creator:</span>
                     <span className="font-bold text-black">
                       {campaign.creator && typeof campaign.creator === 'string' 
                         ? getUserDisplayName(campaign.creator)
                         : 'Unknown'}
                     </span>
                  </div>
                  <div className="flex justify-between">
                                         <span className="text-black font-bold">Status:</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      isNotStarted ? 'bg-yellow-100 text-yellow-800' :
                      isActive ? 'bg-green-100 text-green-800' :
                      isEnded && isGoalMet ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {isNotStarted ? 'Starting Soon' :
                       isActive ? (isGoalMet ? 'Active — Goal Met' : 'Active') : 
                       isEnded && isGoalMet ? 'Goal Met' : 'Ended'}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${
                        isNotStarted ? 'bg-yellow-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(progress * 100, 100)}%` }}
                    ></div>
                  </div>
                                     <div className="text-center text-sm text-black mt-1 font-bold">
                     {isNotStarted ? 'Not started yet' : `${Math.round(progress * 100)}% funded`}
                   </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                                 <h3 className="text-lg font-semibold mb-3 text-black">Timeline</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                                         <span className="text-black font-bold">Start:</span>
                     <span className="text-black font-medium">{new Date(Number(campaign.startAt) * 1000).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                                         <span className="text-black font-bold">End:</span>
                     <span className="text-black font-medium">{new Date(Number(campaign.endAt) * 1000).toLocaleString()}</span>
                  </div>
                  {isNotStarted && (
                    <div className="flex justify-between">
                                             <span className="text-black font-bold">Starts in:</span>
                      <span className="font-medium text-yellow-700">
                        {(() => {
                          const timeLeft = Number(campaign.startAt) - currentTime;
                          if (timeLeft < 60) return `${timeLeft}s`;
                          if (timeLeft < 3600) return `${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s`;
                          const hours = Math.floor(timeLeft / 3600);
                          const minutes = Math.floor((timeLeft % 3600) / 60);
                          return `${hours}h ${minutes}m`;
                        })()}
                      </span>
                    </div>
                  )}
                  {isActive && (
                    <div className="flex justify-between">
                                             <span className="text-black font-bold">Ends in:</span>
                      <span className="font-medium text-green-700">
                        {(() => {
                          const timeLeft = Number(campaign.endAt) - currentTime;
                          if (timeLeft < 60) return `${timeLeft}s`;
                          if (timeLeft < 3600) return `${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s`;
                          const hours = Math.floor(timeLeft / 3600);
                          const minutes = Math.floor((timeLeft % 3600) / 60);
                          return `${hours}h ${minutes}m`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {userContribution > 0n && (
                <div className="bg-blue-50 rounded-lg p-4">
                                     <h3 className="text-lg font-semibold mb-2 text-black">Your Contribution</h3>
                  <div className="text-blue-700 font-medium">
                    {ethers.formatEther(userContribution)} ETH
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Actions & Rewards */}
            <div className="space-y-6">
              {/* Campaign Status Message */}
              {isNotStarted && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Campaign Not Started Yet</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>This campaign will start soon. You can view the details and prepare your contribution.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contribution Form */}
              {isActive && (
                <div className="bg-gray-50 rounded-lg p-4">
                                     <h3 className="text-lg font-semibold mb-3 text-black">Contribute</h3>
                  <div className="space-y-3">
                    {isGoalMet && (
                      <p className="text-xs text-green-700">
                        Goal met! You can still contribute until the end time.
                      </p>
                    )}
                    <div>
                                             <label className="block text-sm font-medium text-black mb-1 font-bold">
                         Amount (ETH)
                       </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={contributionAmount}
                        onChange={(e) => setContributionAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black bg-white"
                        placeholder="0.1"
                      />
                    </div>

                    {rewards.length > 0 && (
                      <div>
                                                 <label className="block text-sm font-medium text-black mb-1 font-bold">
                           Select Reward (Optional)
                         </label>
                        <select
                          value={selectedReward}
                          onChange={(e) => setSelectedReward(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black bg-white"
                        >
                          <option value={-1}>No reward</option>
                          {rewards.map((reward, index) => {
                            const soldOut = reward.quantityAvailable > 0n && reward.claimedCount >= reward.quantityAvailable;
                            return (
                              <option key={index} value={index} disabled={soldOut}>
                                {reward.title} - Min: {ethers.formatEther(reward.minimumContribution)} ETH {soldOut ? "(Sold out)" : ""}
                            </option>
                            );
                          })}
                        </select>
                      </div>
                    )}

                    <button
                      onClick={handlePledge}
                      disabled={isSubmitting || !contributionAmount}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? "Processing..." : "Contribute"}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {isCreator && isEnded && isGoalMet && !campaign.claimed && (
                  <button
                    onClick={handleWithdraw}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? "Processing..." : "Withdraw Funds"}
                  </button>
                )}

                {!isCreator && isEnded && !isGoalMet && userContribution > 0n && (
                  <button
                    onClick={handleRefund}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? "Processing..." : "Refund"}
                  </button>
                )}
              </div>

              {/* Rewards Section */}
              {rewards.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                                     <h3 className="text-lg font-semibold mb-3 text-black">Rewards</h3>
                  <div className="space-y-3">
                    {rewards.map((reward, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{reward.title}</h4>
                                                     <span className="text-sm text-black font-medium">
                             Min: {ethers.formatEther(reward.minimumContribution)} ETH
                           </span>
                        </div>
                                                 <p className="text-sm text-black mb-2 font-medium">{reward.description}</p>
                         <div className="text-xs text-black font-medium">
                           {reward.quantityAvailable > 0n 
                             ? `${reward.claimedCount}/${reward.quantityAvailable} claimed`
                             : "Unlimited"
                           }
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
