// User mapping utility for the Crowdfund DApp
// Maps wallet addresses to user-friendly names

export interface UserInfo {
  id: number;
  name: string;
  address: string;
  avatar?: string;
}

// Hardcoded user mapping for testing
export const USER_MAPPING: UserInfo[] = [
  { id: 1, name: "User 1", address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" },
  { id: 2, name: "User 2", address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" },
  { id: 3, name: "User 3", address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" },
  { id: 4, name: "User 4", address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" },
  { id: 5, name: "User 5", address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" },
  { id: 6, name: "User 6", address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc" },
  { id: 7, name: "User 7", address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9" },
  { id: 8, name: "User 8", address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955" },
  { id: 9, name: "User 9", address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f" },
  { id: 10, name: "User 10", address: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720" },
  { id: 11, name: "User 11", address: "0xBcd4042DE499D14e55001CcbB24a551F3b954096" },
  { id: 12, name: "User 12", address: "0x71bE63f3384f5fb98995898A86B02Fb2426c5788" },
  { id: 13, name: "User 13", address: "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a" },
  { id: 14, name: "User 14", address: "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec" },
  { id: 15, name: "User 15", address: "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097" },
  { id: 16, name: "User 16", address: "0xcd3B766CCDd6AE721141F452C550Ca635964ce71" },
  { id: 17, name: "User 17", address: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30" },
  { id: 18, name: "User 18", address: "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E" },
  { id: 19, name: "User 19", address: "0xdD2FD4581271e230360230F9337D5c0430Bf44C0" },
  { id: 20, name: "User 20", address: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199" }
];

/**
 * Get user info by wallet address
 * @param address - The wallet address to look up
 * @returns UserInfo object or null if not found
 */
export function getUserByAddress(address: string): UserInfo | null {
  if (!address) return null;

  return USER_MAPPING.find(user => 
    user.address === address
  ) || null;
}

/**
 * Get user display name by wallet address
 * @param address - The wallet address to look up
 * @returns User display name or "Unknown User" if not found
 */
export function getUserDisplayName(address: string): string {
  const user = getUserByAddress(address);
  return user ? user.name : "Unknown";
}

/**
 * Get user ID by wallet address
 * @param address - The wallet address to look up
 * @returns User ID or 0 if not found
 */
export function getUserId(address: string): number {
  const user = getUserByAddress(address);
  return user ? user.id : 0;
}

/**
 * Check if an address is a known user
 * @param address - The wallet address to check
 * @returns true if the address is in our user mapping
 */
export function isKnownUser(address: string): boolean {
  return getUserByAddress(address) !== null;
}

/**
 * Get all known users
 * @returns Array of all UserInfo objects
 */
export function getAllUsers(): UserInfo[] {
  return [...USER_MAPPING];
}
