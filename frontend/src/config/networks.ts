import baseDeployment from '../../../lz/starship-nft/deployments/base-testnet/MyONFT721Mock.json';
import arbitrumDeployment from '../../../lz/starship-nft/deployments/arbitrum-testnet/MyONFT721Mock.json';
import baseComposerDeployment from '../../../lz/starship-nft/deployments/base-testnet/MyONFT721ComposerMock.json';
import arbitrumComposerDeployment from '../../../lz/starship-nft/deployments/arbitrum-testnet/MyONFT721ComposerMock.json';
import starHubDeployment from '../../../lz/StarHub/deployments/eth-sepolia/StarHub.json';

export type NetworkKey = 'base-sepolia' | 'arbitrum-sepolia';

interface NetworkConfigItem {
  chainId: number;
  networkKey: NetworkKey;
  rpcUrl: string;
  contractAddress: `0x${string}`;
  composerAddress: `0x${string}`;
  // LayerZero v2 Endpoint ID for cross-chain sends
  // TODO: Fill with the correct EIDs for each network
  lzEid?: number;
}

export const STARSHIP_ABI_PATHS = {
  base: '/lz/starship-nft/deployments/base-testnet/MyONFT721Mock.json',
  arbitrum: '/lz/starship-nft/deployments/arbitrum-testnet/MyONFT721Mock.json',
} as const;

// Contract addresses pulled from deployments json
export const CONTRACT_ADDRESSES: Record<NetworkKey, `0x${string}`> = {
  'base-sepolia': baseDeployment.address as `0x${string}`,
  'arbitrum-sepolia': arbitrumDeployment.address as `0x${string}`,
};

// Composer addresses for battle functionality
export const COMPOSER_ADDRESSES: Record<NetworkKey, `0x${string}`> = {
  'base-sepolia': baseComposerDeployment.address as `0x${string}`,
  'arbitrum-sepolia': arbitrumComposerDeployment.address as `0x${string}`,
};

// Ship specs contract address (StarHub contract) - deployed on eth-sepolia as hub
export const SHIP_SPECS_ADDRESS = starHubDeployment.address as `0x${string}`;

export const NETWORKS: Record<NetworkKey, NetworkConfigItem> = {
  'base-sepolia': {
    chainId: 84532,
    networkKey: 'base-sepolia',
    rpcUrl: 'https://sepolia.base.org',
    contractAddress: CONTRACT_ADDRESSES['base-sepolia'],
    composerAddress: COMPOSER_ADDRESSES['base-sepolia'],
    // LayerZero v2 EID for Base Sepolia testnet
    lzEid: 40245,
  },
  'arbitrum-sepolia': {
    chainId: 421614,
    networkKey: 'arbitrum-sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    contractAddress: CONTRACT_ADDRESSES['arbitrum-sepolia'],
    composerAddress: COMPOSER_ADDRESSES['arbitrum-sepolia'],
    // LayerZero v2 EID for Arbitrum Sepolia testnet
    lzEid: 40231,
  },
};

export const PLANET_TO_NETWORK: Record<string, NetworkKey> = {
  Vulcania: 'arbitrum-sepolia',
  Amethea: 'base-sepolia',
};
