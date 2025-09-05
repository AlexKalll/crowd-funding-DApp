"use client";
import { useState, useEffect } from "react";
import { getUserDisplayName } from "@/utils/userMapping";
import { ethers } from "ethers";
import type { Campaign } from "@/types";

interface CampaignCardProps {
  campaign: Campaign;
  currentTime: number;
  onSelect: (campaign: Campaign) => void;
  userAddress?: string;
}

export default function CampaignCard({ campaign, currentTime, onSelect, userAddress }: CampaignCardProps) {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration errors by only rendering time-based content on client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 animate-pulse">
        <div className="p-6">
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="h-3 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded mb-4"></div>
          <div className="h-2 bg-gray-200 rounded mb-2"></div>
        </div>
      </div>
    );
  }

  const isNotStarted = currentTime < Number(campaign.startAt);
  const isActive = currentTime >= Number(campaign.startAt) && currentTime <= Number(campaign.endAt);
  const isEnded = currentTime > Number(campaign.endAt);
  const isGoalMet = campaign.pledged >= campaign.goal;
  const progress = Number(campaign.pledged) / Number(campaign.goal);
  
  const getStatusBadge = () => {
    if (isNotStarted) {
      return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Starting Soon</span>;
    }
    if (isActive) {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Active</span>;
    }
    if (isEnded) {
      if (isGoalMet) {
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Goal Met</span>;
      }
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Goal Not Met</span>;
    }
    return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Unknown</span>;
  };

  const getTimeLeft = () => {
    if (isEnded) {
      return "Ended";
    }
    if (isNotStarted) {
      const timeLeft = Number(campaign.startAt) - currentTime;
      if (timeLeft < 60) return `⏰ Starts in ${timeLeft}s`;
      if (timeLeft < 3600) return `⏰ Starts in ${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s`;
      const hours = Math.floor(timeLeft / 3600);
      const minutes = Math.floor((timeLeft % 3600) / 60);
      return `⏰ Starts in ${hours}h ${minutes}m`;
    }
    if (isActive) {
      const timeLeft = Number(campaign.endAt) - currentTime;
      if (timeLeft < 60) return `⏳ Ends in ${timeLeft}s`;
      if (timeLeft < 3600) return `⏳ Ends in ${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s`;
      const hours = Math.floor(timeLeft / 3600);
      const minutes = Math.floor((timeLeft % 3600) / 60);
      return `⏳ Ends in ${hours}h ${minutes}m`;
    }
    return "Unknown";
  };

  const isCreator = userAddress && typeof userAddress === 'string' && 
    userAddress.toLowerCase() === campaign.creator.toLowerCase();

  return (
    <div 
      className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-gray-200 hover:border-indigo-300"
      onClick={() => onSelect(campaign)}
    >
            <div className="p-6 bg-gradient-to-br from-white to-gray-50">
        <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-md font-bold text-black">Campaign {campaign.id}</h3>
              {campaign.metadataURI && (
                <div className="mt-1">
                  {campaign.metadataURI.startsWith('http') ? (
                    <a 
                      href={campaign.metadataURI} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 underline text-sm break-all font-bold bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-colors inline-block"
                      onClick={(e) => e.stopPropagation()}
                    >
                    Click Here for the Project Detail.
                    </a>
                  ) : (
                    <p className="text-sm text-black font-medium leading-relaxed line-clamp-2">
                      {campaign.metadataURI}
                    </p>
                  )}
                </div>
              )}
            </div>
            {getStatusBadge()}
          </div>

        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-black font-bold">Goal:</span>
            <span className="font-bold text-black">{ethers.formatEther(campaign.goal)} ETH</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-black font-bold">Pledged:</span>
            <span className="font-bold text-black">{ethers.formatEther(campaign.pledged)} ETH</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isNotStarted ? 'bg-yellow-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            ></div>
          </div>
          
          <div className="text-xs text-black font-bold text-center">
            {isNotStarted ? 'Not started yet' : `${Math.round(progress * 100)}% funded`}
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="text-sm text-black">
              <span className="font-bold">Creator:</span> 
              <span className="font-medium text-black">
                {campaign.creator && typeof campaign.creator === 'string' 
                  ? getUserDisplayName(campaign.creator)
                  : 'Unknown'}
              </span>
          </div>
          <div className={`text-sm ${isNotStarted ? 'text-yellow-700 font-bold' : isActive ? 'text-green-700 font-bold' : 'text-black font-bold'}`}>
            <span className="font-bold">Time:</span> {getTimeLeft()}
          </div>
        </div>

        {isCreator && (
          <div className="text-xs text-indigo-600 font-medium">
            👑 You created this campaign
          </div>
        )}
      </div>
    </div>
  );
}
