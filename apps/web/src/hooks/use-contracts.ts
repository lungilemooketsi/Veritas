import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';

// Contract ABIs (simplified for frontend use)
const ESCROW_ABI = [
  {
    name: 'createTrade',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'buyer', type: 'address' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'price', type: 'uint256' },
      { name: 'expiry', type: 'uint256' },
    ],
    outputs: [{ name: 'tradeId', type: 'bytes32' }],
  },
  {
    name: 'acceptTrade',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tradeId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'confirmDelivery',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tradeId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'raiseDispute',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tradeId', type: 'bytes32' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'cancelTrade',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tradeId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'getTrade',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tradeId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'seller', type: 'address' },
          { name: 'buyer', type: 'address' },
          { name: 'tokenAddress', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'price', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
        ],
      },
    ],
  },
] as const;

const REPUTATION_ABI = [
  {
    name: 'getReputation',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'totalTrades', type: 'uint256' },
          { name: 'successfulTrades', type: 'uint256' },
          { name: 'totalRating', type: 'uint256' },
          { name: 'disputesRaised', type: 'uint256' },
          { name: 'disputesLost', type: 'uint256' },
          { name: 'lastUpdated', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'getCurrentTier',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'getTrustScore',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const BRIDGE_ABI = [
  {
    name: 'bridgeTokens',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'destinationChainSelector', type: 'uint64' },
      { name: 'receiver', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'messageId', type: 'bytes32' }],
  },
  {
    name: 'syncReputation',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'destinationChainSelector', type: 'uint64' },
      { name: 'user', type: 'address' },
    ],
    outputs: [{ name: 'messageId', type: 'bytes32' }],
  },
  {
    name: 'getFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'destinationChainSelector', type: 'uint64' },
      { name: 'receiver', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'messageType', type: 'uint8' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Contract addresses (from environment)
const CONTRACTS = {
  escrow: process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}`,
  reputation: process.env.NEXT_PUBLIC_REPUTATION_ADDRESS as `0x${string}`,
  bridge: process.env.NEXT_PUBLIC_BRIDGE_ADDRESS as `0x${string}`,
  soulbound: process.env.NEXT_PUBLIC_SOULBOUND_ADDRESS as `0x${string}`,
};

// Escrow hooks
export function useCreateTrade() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const createTrade = (
    buyer: `0x${string}`,
    tokenAddress: `0x${string}`,
    amount: string,
    price: string,
    expiry: number
  ) => {
    writeContract({
      address: CONTRACTS.escrow,
      abi: ESCROW_ABI,
      functionName: 'createTrade',
      args: [
        buyer,
        tokenAddress,
        parseUnits(amount, 6), // USDC decimals
        parseUnits(price, 6),
        BigInt(expiry),
      ],
    });
  };

  return { createTrade, hash, isPending, isConfirming, isSuccess, error };
}

export function useAcceptTrade() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const acceptTrade = (tradeId: `0x${string}`) => {
    writeContract({
      address: CONTRACTS.escrow,
      abi: ESCROW_ABI,
      functionName: 'acceptTrade',
      args: [tradeId],
    });
  };

  return { acceptTrade, hash, isPending, isConfirming, isSuccess, error };
}

export function useConfirmDelivery() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const confirmDelivery = (tradeId: `0x${string}`) => {
    writeContract({
      address: CONTRACTS.escrow,
      abi: ESCROW_ABI,
      functionName: 'confirmDelivery',
      args: [tradeId],
    });
  };

  return { confirmDelivery, hash, isPending, isConfirming, isSuccess, error };
}

export function useRaiseDispute() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const raiseDispute = (tradeId: `0x${string}`, reason: string) => {
    writeContract({
      address: CONTRACTS.escrow,
      abi: ESCROW_ABI,
      functionName: 'raiseDispute',
      args: [tradeId, reason],
    });
  };

  return { raiseDispute, hash, isPending, isConfirming, isSuccess, error };
}

// Reputation hooks
export function useReputation(address: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACTS.reputation,
    abi: REPUTATION_ABI,
    functionName: 'getReputation',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useCurrentTier(address: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACTS.reputation,
    abi: REPUTATION_ABI,
    functionName: 'getCurrentTier',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useTrustScore(address: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACTS.reputation,
    abi: REPUTATION_ABI,
    functionName: 'getTrustScore',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

// Bridge hooks
export function useBridgeTokens() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const bridgeTokens = (
    destinationChainSelector: bigint,
    receiver: `0x${string}`,
    token: `0x${string}`,
    amount: string,
    fee: bigint
  ) => {
    writeContract({
      address: CONTRACTS.bridge,
      abi: BRIDGE_ABI,
      functionName: 'bridgeTokens',
      args: [destinationChainSelector, receiver, token, parseUnits(amount, 6)],
      value: fee,
    });
  };

  return { bridgeTokens, hash, isPending, isConfirming, isSuccess, error };
}

export function useBridgeFee(
  destinationChainSelector: bigint,
  receiver: `0x${string}` | undefined,
  token: `0x${string}`,
  amount: string
) {
  return useReadContract({
    address: CONTRACTS.bridge,
    abi: BRIDGE_ABI,
    functionName: 'getFee',
    args: receiver
      ? [destinationChainSelector, receiver, token, parseUnits(amount || '0', 6), 0]
      : undefined,
    query: { enabled: !!receiver && !!amount },
  });
}

// ERC20 hooks
export function useTokenApproval() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (tokenAddress: `0x${string}`, spender: `0x${string}`, amount: string) => {
    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, parseUnits(amount, 6)],
    });
  };

  return { approve, hash, isPending, isConfirming, isSuccess, error };
}

export function useTokenBalance(tokenAddress: `0x${string}`, account: `0x${string}` | undefined) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: { enabled: !!account },
  });
}

export function useTokenAllowance(
  tokenAddress: `0x${string}`,
  owner: `0x${string}` | undefined,
  spender: `0x${string}`
) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: owner ? [owner, spender] : undefined,
    query: { enabled: !!owner },
  });
}
