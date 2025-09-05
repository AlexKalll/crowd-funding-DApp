import { useState } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (goal: bigint, startAt: number, endAt: number, metadataURI: string) => Promise<void>;
}

export default function CreateCampaignModal({ isOpen, onClose, onCreate }: CreateCampaignModalProps) {
  const [formData, setFormData] = useState({
    goal: "",
    startDelayMinutes: "1", // delay before campaign starts to allow adding rewards
    duration: "9", // minutes
    metadataURI: "https://docs.google.com/document/d/1jdY7RMJFsRBis3XAMLv10tXP5u_51HFHJv0fH9_vIis/edit?usp=sharing"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.goal || parseFloat(formData.goal) <= 0) {
      toast.error("Please enter a valid goal amount");
      return;
    }

    if (parseInt(formData.duration) < 1) {
      toast.error("Duration must be at least 1 minute");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const now = Math.floor(Date.now() / 1000);
      // User-configured delay (minutes) with a minimum 15s buffer for safety
      const userDelaySec = Math.max(0, (parseInt(formData.startDelayMinutes) || 0) * 60);
      const startAt = now + Math.max(15, userDelaySec);
      const endAt = startAt + (parseInt(formData.duration) * 60);
      const goal = ethers.parseEther(formData.goal);
      
      await onCreate(goal, startAt, endAt, formData.metadataURI);
      onClose();
      setFormData({ goal: "", startDelayMinutes: "1", duration: "60", metadataURI: "https://docs.google.com/document/d/1jdY7RMJFsRBis3XAMLv10tXP5u_51HFHJv0fH9_vIis/edit?usp=sharing" });
    } catch (error) {
      console.error("Failed to create campaign:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
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
          <h2 className="text-xl font-semibold text-black">Create New Campaign</h2>
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
               Goal (ETH)
             </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black bg-white"
              placeholder="1.0"
              required
            />
          </div>

          <div>
                         <label className="block text-sm font-medium text-black mb-1 font-bold">
               Start delay (minutes)
             </label>
            <input
              type="number"
              min="0"
              step="1"
              value={formData.startDelayMinutes}
              onChange={(e) => setFormData({ ...formData, startDelayMinutes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black bg-white"
              placeholder="1"
              required
            />
                         <p className="text-xs text-black mt-1 font-medium">
               Your campaign will start after this delay. You can add rewards any time before it starts.
             </p>
          </div>

          <div>
                         <label className="block text-sm font-medium text-black mb-1 font-bold">
               Duration (minutes)
             </label>
            <input
              type="number"
              min="1"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black bg-white"
              placeholder="60"
              required
            />
                         <p className="text-xs text-black mt-1 font-medium">
               Starts in: {formatTime(Math.max(15, (parseInt(formData.startDelayMinutes) || 0) * 60))} · Runs for: {formatTime((parseInt(formData.duration) || 0) * 60)}
             </p>
          </div>

          <div>
              <label className="block text-sm font-medium text-black mb-1 font-bold">
               Project Description URL
             </label>
            <input
              type="text"
              value={formData.metadataURI}
              onChange={(e) => setFormData({ ...formData, metadataURI: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black bg-white"
              placeholder="https://docs.google.com/document/d/1jdY7RMJFsRBis3XAMLv10tXP5u_51HFHJv0fH9_vIis/edit?usp=sharing"
              required
            />
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
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Creating..." : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
