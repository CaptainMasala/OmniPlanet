import { useEffect, useMemo, useState } from 'react';
import { Address } from 'viem';
import { useAccount } from 'wagmi';
import { NetworkKey, NETWORKS } from '@/config/networks';
import { toBytes32, useStarshipContract } from '@/hooks/useStarshipContract';

export interface StarshipState {
  hasShip: boolean;
  tokenId?: bigint;
  tokenUri?: string;
  isLoading: boolean;
  error?: string;
  // Add multi-chain balance information
  balances: Record<NetworkKey, { balance: bigint; tokenIds: bigint[] }>;
}

export function useStarship(network: NetworkKey) {
  const { address } = useAccount();
  const contract = useStarshipContract(network);

  // Create contracts for all networks
  const arbitrumContract = useStarshipContract('arbitrum-sepolia');
  const baseContract = useStarshipContract('base-sepolia');

  const [state, setState] = useState<StarshipState>({
    hasShip: false,
    isLoading: false,
    balances: {
      'arbitrum-sepolia': { balance: 0n, tokenIds: [] },
      'base-sepolia': { balance: 0n, tokenIds: [] },
    },
  });

  const refresh = async () => {
    if (!address) {
      return setState(s => ({
        ...s,
        hasShip: false,
        balances: {
          'arbitrum-sepolia': { balance: 0n, tokenIds: [] },
          'base-sepolia': { balance: 0n, tokenIds: [] },
        },
      }));
    }

    setState(s => ({ ...s, isLoading: true }));

    try {
      // Fetch balances from all implemented chains
      const balancePromises = [
        (async () => {
          try {
            const balance = await arbitrumContract.readBalanceOf(
              address as Address
            );

            // If balance > 0, fetch token IDs
            const tokenIds: bigint[] = [];
            if (balance > 0n) {
              // For now, we'll check token IDs 1-10 (adjust range as needed)
              for (let i = 1; i <= 10; i++) {
                try {
                  const tokenId = BigInt(i);
                  const owner = await arbitrumContract.ownerOf(tokenId);
                  if (owner.toLowerCase() === address.toLowerCase()) {
                    tokenIds.push(tokenId);
                  }
                } catch (error) {
                  // Token doesn't exist or other error, continue to next
                  break;
                }
              }
            }

            return {
              network: 'arbitrum-sepolia' as NetworkKey,
              balance,
              tokenIds,
            };
          } catch (error) {
            console.error(
              '[useStarship] Error fetching balance from arbitrum-sepolia:',
              error
            );
            return {
              network: 'arbitrum-sepolia' as NetworkKey,
              balance: 0n,
              tokenIds: [],
            };
          }
        })(),
        (async () => {
          try {
            const balance = await baseContract.readBalanceOf(
              address as Address
            );

            // If balance > 0, fetch token IDs
            const tokenIds: bigint[] = [];
            if (balance > 0n) {
              // For now, we'll check token IDs 1-10 (adjust range as needed)
              for (let i = 1; i <= 10; i++) {
                try {
                  const tokenId = BigInt(i);
                  const owner = await baseContract.ownerOf(tokenId);
                  if (owner.toLowerCase() === address.toLowerCase()) {
                    tokenIds.push(tokenId);
                  }
                } catch (error) {
                  // Token doesn't exist or other error, continue to next
                  break;
                }
              }
            }

            return { network: 'base-sepolia' as NetworkKey, balance, tokenIds };
          } catch (error) {
            console.error(
              '[useStarship] Error fetching balance from base-sepolia:',
              error
            );
            return {
              network: 'base-sepolia' as NetworkKey,
              balance: 0n,
              tokenIds: [],
            };
          }
        })(),
      ];

      const results = await Promise.all(balancePromises);

      // Update balances state
      const newBalances: Record<
        NetworkKey,
        { balance: bigint; tokenIds: bigint[] }
      > = {
        'arbitrum-sepolia': { balance: 0n, tokenIds: [] },
        'base-sepolia': { balance: 0n, tokenIds: [] },
      };

      results.forEach(({ network, balance, tokenIds }) => {
        newBalances[network] = { balance, tokenIds };
      });

      // Check if user has any ships across all chains
      const totalBalance = results.reduce(
        (sum, { balance }) => sum + balance,
        0n
      );
      const hasShip = totalBalance > 0n;

      // For now, use the first available token from any chain
      let tokenId: bigint | undefined;
      let tokenUri: string | undefined;

      for (const { network, tokenIds } of results) {
        if (tokenIds.length > 0) {
          tokenId = tokenIds[0];
          try {
            const networkContract =
              network === 'arbitrum-sepolia' ? arbitrumContract : baseContract;
            tokenUri = await networkContract.tokenURI(tokenId);
            break;
          } catch (error) {
            console.error(
              `[useStarship] Error fetching token URI for ${tokenId} on ${network}:`,
              error
            );
          }
        }
      }

      setState({
        hasShip,
        tokenId,
        tokenUri,
        isLoading: false,
        balances: newBalances,
      });
    } catch (e: any) {
      console.error('[useStarship] Error in refresh:', e);
      setState({
        hasShip: false,
        isLoading: false,
        error: e?.message ?? 'Error',
        balances: {
          'arbitrum-sepolia': { balance: 0n, tokenIds: [] },
          'base-sepolia': { balance: 0n, tokenIds: [] },
        },
      });
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, network]);

  const mint = async (amount: bigint = 1n) => {
    if (!address) throw new Error('No wallet');
    const tx = await contract.mint(address as Address, amount);
    return tx;
  };

  const travel = async (params: {
    destination: NetworkKey;
    tokenId: bigint;
    playerId: number;
  }) => {
    if (!address) throw new Error('No wallet');
    const dst = NETWORKS[params.destination];
    if (!dst.lzEid) throw new Error('Missing LayerZero EID for destination');

    try {
      const msgFee = await contract.quoteSend({
        dstEid: dst.lzEid,
        tokenId: params.tokenId,
        composerAddress: dst.composerAddress,
        playerId: params.playerId,
      });

      const tx = await contract.send({
        dstEid: dst.lzEid,
        tokenId: params.tokenId,
        feeNative: msgFee.nativeFee,
        refundAddress: address as Address,
        composerAddress: dst.composerAddress,
        playerId: params.playerId,
      });
      return tx;
    } catch (error) {
      console.error('Travel error:', error);
      throw error;
    }
  };

  return {
    state,
    refresh,
    mint,
    travel,
  };
}
