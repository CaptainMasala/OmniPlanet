# OmniPlanet Frontend

A cross-chain NFT game built with Next.js, React, and LayerZero V2.

## Features

### Core Gameplay

- **Cross-chain NFT Travel**: Send your starship NFT between different blockchains (Base Sepolia and Arbitrum Sepolia)
- **Battle System**: Engage in battles on the same chain or travel to other chains for cross-chain battles
- **Multi-chain Balance Tracking**: View your NFT balances across all supported networks
- **Real-time Game State**: Monitor ship stats, health, and battle progress

### New Features (Latest Update)

#### Travel System

- **Travel to Battle**: Send your NFT to another planet/blockchain for cross-chain battles
- **Battle Here**: Engage in battles on the current planet/blockchain
- **Player ID System**: Each action is associated with a player ID (1 or 2) for zone claiming

#### Technical Implementation

- **Composer Integration**: Uses LayerZero composer contracts for cross-chain functionality
- **Zone Claiming**: Automatic zone claiming when traveling or battling
- **Gas Optimization**: Efficient cross-chain messaging with proper gas estimation

## Game Mechanics

### Planets

- **Vulcania** (Arbitrum Sepolia): Mining world with lava-themed resources
- **Amethea** (Base Sepolia): Research hub with purple-themed resources

### Actions

1. **Travel to Battle**:
   - Sends NFT to another chain with composer functionality
   - Triggers zone claiming on destination
   - Uses Player ID 1
2. **Battle Here**:
   - Battles on current chain with composer functionality
   - Triggers zone claiming locally
   - Uses Player ID 2

Both actions use the same underlying `travel` function with optional composer parameters.

### Contract Architecture

- **Starship NFTs**: Deployed on both Base Sepolia and Arbitrum Sepolia
- **Composer Contracts**: Handle zone claiming and cross-chain messaging
- **StarHub Contract**: Central game state management on Ethereum Sepolia

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or compatible wallet

### Setup

```bash
npm install
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

- Wallet connection settings
- RPC endpoints (optional, defaults provided)

### Building

```bash
npm run build
npm start
```

## Contract Addresses

### Base Sepolia

- Starship NFT: `0x...` (from deployment)
- Composer: `0xC5a12E8A9236a66C66f1a0DEB298e51285B1f82f`

### Arbitrum Sepolia

- Starship NFT: `0x...` (from deployment)
- Composer: `0x35Eb2Aba1d06CFeB20729142E61005F418F8459e`

### Ethereum Sepolia

- StarHub: `0x224aaD4111D60e32C1Ea06b9487154eFc18f4B33`

## Game Flow

1. **Connect Wallet**: Connect your Web3 wallet
2. **Mint Ship**: Create your first starship NFT
3. **Explore Galaxy**: Navigate between planets
4. **Travel or Battle**: Choose your action based on ship location
5. **Claim Zones**: Automatically claim zones for battle progression
6. **Monitor Progress**: Track your ship's stats and battle status

## Technical Notes

### Cross-chain Messaging

- Uses LayerZero V2 for cross-chain communication
- Single `travel` function handles both cross-chain and same-chain operations
- Composer contracts handle zone claiming logic
- Gas fees are automatically calculated and included

### Player IDs

- Player ID 1: Used for travel actions
- Player ID 2: Used for battle actions
- Each ID has separate zone tracking

### Error Handling

- Graceful fallbacks for network issues
- Clear error messages for user feedback
- Automatic retry mechanisms for failed transactions
