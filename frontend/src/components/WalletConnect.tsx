import { useState, useEffect } from "react";
import { getUserDisplayName } from "@/utils/userMapping";
import { ethers } from "ethers";
import { getBrowserProvider } from "@/lib/web3";

interface WalletConnectProps {
  onConnect: (account: string, balance: string) => void;
  onDisconnect: () => void;
}

export default function WalletConnect({ onConnect, onDisconnect }: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    const provider = getBrowserProvider();
    if (provider) {
      try {
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          await handleAccountChange(accounts[0]);
        }
      } catch (error) {
        console.log("No accounts found");
      }
    }
  }

  // Normalize various event payloads to a checksum address string
  async function handleAccountChange(next: unknown) {
    let addr: string | null = null;

    if (Array.isArray(next)) {
      addr = next[0] ?? null;
    } else if (typeof next === "string") {
      addr = next;
    } else if (next && typeof next === "object" && (next as any).address) {
      addr = (next as any).address as string;
    }

    if (!addr) {
      // Treat as disconnect
      setAccount(null);
      setBalance("0");
      onDisconnect();
      return;
    }

    setAccount(addr);
    const provider = getBrowserProvider();
    if (provider) {
      try {
        const balance = await provider.getBalance(addr);
      const balanceStr = ethers.formatEther(balance);
      setBalance(balanceStr);
        onConnect(addr, balanceStr);
      } catch (error) {
        console.error("Failed to get balance:", error);
        setBalance("0");
      }
    }
  }

  async function connect() {
    setIsConnecting(true);
    try {
      const provider = getBrowserProvider();
      if (!provider) {
        alert("MetaMask not found! Please install MetaMask.");
        return;
      }

      await provider.send("eth_requestAccounts", []);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        await handleAccountChange(accounts[0]);
      }

      // Listen for account changes via EIP-1193
      if (typeof window !== "undefined" && (window as any).ethereum?.on) {
        (window as any).ethereum.on("accountsChanged", (accounts: string[]) => {
          handleAccountChange(accounts);
        });
      }
    } catch (error: any) {
      console.error("Connection failed:", error);
      alert(error.message || "Failed to connect");
    } finally {
      setIsConnecting(false);
    }
  }

  async function disconnect() {
     try {
      const provider = getBrowserProvider();
      if (provider?.send) {
        await provider.send("wallet_revokePermissions", [{ eth_accounts: {} }]);
      }
    } catch (error: any) {
      console.error("Failed to disconnect:", error);
    } finally {
    setAccount(null);
    setBalance("0");
    onDisconnect();
    }
  }

  if (account) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-black font-medium">
            {account && typeof account === 'string' ? getUserDisplayName(account) : 'Unknown User'}
          </div>
          <div className="text-xs text-gray-500">{parseFloat(balance).toFixed(4)} ETH</div>
        </div>
        <button
          onClick={disconnect}
          className="px-3 py-1.5 text-sm bg-red-400 text-white rounded-lg hover:bg-pink-700 transition-colors"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
    >
      {isConnecting ? "Connecting..." : "Connect MetaMask"}
    </button>
  );
}
