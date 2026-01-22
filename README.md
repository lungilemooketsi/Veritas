# Veritas Marketplace

A decentralized Web3 marketplace featuring:
- 🏦 **Fiat-to-Crypto Onboarding** via Stripe Crypto Onramp
- 🌉 **Cross-Chain Interoperability** via Chainlink CCIP
- 🎖️ **Soulbound Token Reputation System** (EIP-5192)
- 🔒 **Secure Escrow Trading**

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         VERITAS MARKETPLACE                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Next.js    │  │   Backend    │  │    The Graph         │  │
│  │   Frontend   │◄─┤   API        │◄─┤    Subgraph          │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│  ┌──────┴─────────────────┴──────────────────────┴───────────┐  │
│  │                    Smart Contracts                         │  │
│  │  ┌────────────┐ ┌────────────┐ ┌─────────────────────────┐│  │
│  │  │  Escrow    │ │ Reputation │ │   SoulboundToken        ││  │
│  │  │  Contract  │ │  Engine    │ │   (EIP-5192)            ││  │
│  │  └────────────┘ └────────────┘ └─────────────────────────┘│  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────┴──────────────────────────────┐   │
│  │                  Blockchain Networks                      │   │
│  │    ┌─────────┐    ┌─────────┐    ┌─────────┐             │   │
│  │    │ Polygon │◄──►│Arbitrum │◄──►│Ethereum │             │   │
│  │    └─────────┘    └─────────┘    └─────────┘             │   │
│  │              Chainlink CCIP (Cross-Chain)                 │   │
│  └───────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌───────────────────────────┴──────────────────────────────┐   │
│  │                    External Services                      │   │
│  │    ┌─────────────────┐    ┌──────────────────────────┐   │   │
│  │    │ Stripe Crypto   │    │  Chainlink Price Feeds   │   │   │
│  │    │ Onramp (KYC)    │    │  & VRF                   │   │   │
│  │    └─────────────────┘    └──────────────────────────┘   │   │
│  └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
veritas/
├── apps/
│   ├── web/                    # Next.js Frontend
│   └── api/                    # Express Backend API
├── packages/
│   ├── contracts/              # Solidity Smart Contracts
│   ├── subgraph/               # The Graph Subgraph
│   └── shared/                 # Shared Types & Utils
└── docs/                       # Documentation
```

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Network | Polygon / Arbitrum | Low gas fees, fast finality |
| Fiat Gateway | Stripe Crypto Onramp | User-friendly fiat conversion |
| Smart Contracts | Solidity + Hardhat | Escrow, Reputation, SBTs |
| Token Standard | EIP-5192 | Non-transferable reputation tokens |
| Indexing | The Graph | Fast reputation data queries |
| Frontend | Next.js 14 + wagmi + viem | Modern Web3 UX |
| Backend | Express + TypeScript | API & webhook handling |
| Cross-Chain | Chainlink CCIP | Secure asset bridging |

## Quick Start

### Prerequisites
- Node.js >= 18
- pnpm or npm
- MetaMask or compatible wallet
- Stripe account (for onramp)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Compile contracts
npm run compile

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file:

```env
# Blockchain
PRIVATE_KEY=your_deployer_private_key
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# The Graph
GRAPH_API_KEY=your_graph_api_key
SUBGRAPH_ENDPOINT=https://api.thegraph.com/subgraphs/name/...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Core Workflows

### 1. User Onboarding Flow
```
User → Stripe KYC → Purchase USDC → Wallet Funded → Ready to Trade
```

### 2. Trading Flow
```
Buyer Creates Order → Funds Locked in Escrow → Seller Delivers → 
Buyer Confirms → Funds Released → Reputation Updated
```

### 3. Reputation Minting Flow
```
50+ Trades + 4.8+ Rating → Threshold Met → SBT Auto-Minted → 
Badge Visible On-Chain
```

## Smart Contract Addresses

### Polygon Mainnet
| Contract | Address |
|----------|---------|
| VeritasEscrow | `TBD` |
| ReputationEngine | `TBD` |
| SoulboundBadge | `TBD` |

### Arbitrum One
| Contract | Address |
|----------|---------|
| VeritasEscrow | `TBD` |
| ReputationEngine | `TBD` |
| SoulboundBadge | `TBD` |

## License

MIT License - see [LICENSE](LICENSE) for details.
