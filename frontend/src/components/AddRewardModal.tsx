import { useState } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import type { Campaign } from "@/types";

interface AddRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  onAddReward: (campaignId: number, title: string, description: string, minContribution: bigint, quantity: bigint) => Promise<void>;
}

export default function AddRewardModal({ isOpen, onClose, campaign, onAddReward }: AddRewardModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    minContribution: "",
    quantity: "0" // 0 = unlimited
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !campaign) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent adding rewards after campaign start (mirrors contract)
    if (campaign && Date.now() / 1000 >= Number(campaign.startAt)) {
      toast.error("Cannot add reward after campaign start");
      return;
    }
    
    if (!formData.title.trim()) {
      toast.error("Please enter a reward title");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Please enter a reward description");
      return;
    }

    if (!formData.minContribution || parseFloat(formData.minContribution) <= 0) {
      toast.error("Please enter a valid minimum contribution amount");
      return;
    }

    if (parseInt(formData.quantity) < 0) {
      toast.error("Quantity cannot be negative");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const minContribution = ethers.parseEther(formData.minContribution);
      const quantity = BigInt(formData.quantity);
      
      await onAddReward(campaign.id, formData.title, formData.description, minContribution, quantity);
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        minContribution: "",
        quantity: "0"
      });
    } catch (error) {
      console.error("Failed to add reward:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-black">Add Reward to Campaign {campaign.id}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1 font-bold">
              Reward Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black bg-white"
              placeholder="e.g., Early Bird Special"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1 font-bold">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black bg-white"
              placeholder="Describe what backers get for this reward tier"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1 font-bold">
              Minimum Contribution (ETH)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.minContribution}
              onChange={(e) => setFormData({ ...formData, minContribution: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black bg-white"
              placeholder="0.1"
              required
            />
            <p className="text-xs text-black mt-1 font-medium">
              Backers must contribute at least this amount to claim this reward
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1 font-bold">
              Quantity Available
            </label>
            <input
              type="number"
              min="0"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black bg-white"
              placeholder="0"
            />
            <p className="text-xs text-black mt-1 font-medium">
              Leave as 0 for unlimited rewards
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-pink-800 text-pink-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Adding..." : "Add Reward"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
