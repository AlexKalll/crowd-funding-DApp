import { ethers } from "ethers";
import deployments from "@/constants/deployments.localhost.json";
import crowdfundArtifact from "@/constants/Crowdfund.json";

// Minimal EIP-1193 provider shape
type EIP1193Provider = {
	request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
	on?: (event: string, listener: (...args: unknown[]) => void) => void;
	removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

type DeploymentsFile = { Crowdfund?: { address?: string } };
type CrowdfundArtifact = { abi: ethers.InterfaceAbi };

export function getBrowserProvider(): ethers.BrowserProvider | null {
	if (typeof window === "undefined") return null;
	const eth = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
	if (!eth) return null;
	return new ethers.BrowserProvider(eth);
}

export async function getSigner(): Promise<ethers.Signer | null> {
	const provider = getBrowserProvider();
	if (!provider) return null;
	return await provider.getSigner();
}

export function getCrowdfundAddress(): string | undefined {
	return (deployments as unknown as DeploymentsFile)?.Crowdfund?.address;
}

export async function getCrowdfundReadContract(): Promise<ethers.Contract | null> {
	const provider = getBrowserProvider();
	const address = getCrowdfundAddress();
	if (!provider || !address) return null;
	try {
		const code = await provider.getCode(address);
		if (!code || code === "0x") return null;
	} catch {
		return null;
	}
	return new ethers.Contract(address, (crowdfundArtifact as unknown as CrowdfundArtifact).abi, provider);
}

export async function getCrowdfundWriteContract(): Promise<ethers.Contract | null> {
	const signer = await getSigner();
	const address = getCrowdfundAddress();
	if (!signer || !address) return null;
	try {
		const provider = (signer.provider ?? await getBrowserProvider());
		if (!provider) return null;
		const code = await provider.getCode(address);
		if (!code || code === "0x") return null;
	} catch {
		return null;
	}
	return new ethers.Contract(address, (crowdfundArtifact as unknown as CrowdfundArtifact).abi, signer);
}

// Backward compatibility
export const getCrowdfundContract = getCrowdfundWriteContract;


// Network helpers
export const HARDHAT_CHAIN_ID_DEC = 31337;
export const HARDHAT_CHAIN_ID_HEX = "0x7A69"; // 31337
export const HARDHAT_RPC_URL = "http://127.0.0.1:8545";

export async function getNetworkInfo(): Promise<{ chainId: string; name: string } | null> {
	try {
		const provider = getBrowserProvider();
		if (!provider) return null;
		const network = await provider.getNetwork();
		return { chainId: `0x${network.chainId.toString(16)}`, name: network.name || "unknown" };
	} catch {
		return null;
	}
}

export async function switchToLocalhost(): Promise<boolean> {
	if (typeof window === "undefined") return false;
	const eth = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
	if (!eth?.request) return false;
	try {
		await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HARDHAT_CHAIN_ID_HEX }] });
		return true;
	} catch (err: unknown) {
		// 4902: Unrecognized chain, try to add
		const code = (err as { code?: number }).code;
		if (code === 4902) {
			try {
				await eth.request({
					method: "wallet_addEthereumChain",
					params: [
						{
							chainId: HARDHAT_CHAIN_ID_HEX,
							chainName: "Hardhat Localhost",
							nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
							rpcUrls: [HARDHAT_RPC_URL],
						},
					],
				});
				// After adding, switch again
				await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HARDHAT_CHAIN_ID_HEX }] });
				return true;
			} catch {
				return false;
			}
		}
		return false;
	}
}


