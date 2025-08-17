import { useMemo } from 'react';
import { publicClients } from '@/lib/viem';
import { STARSHIP_ABI } from '@/lib/abi';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';
import { Address, Hex, encodeFunctionData, encodeAbiParameters } from 'viem';
import { CONTRACT_ADDRESSES, NetworkKey, NETWORKS } from '@/config/networks';
import { useSwitchChain, useWalletClient, useAccount } from 'wagmi';

interface SendParam {
  dstEid: number; // uint32 in Solidity
  to: Hex; // bytes32 in Solidity
  tokenId: bigint; // uint256 in Solidity
  extraOptions: Hex; // bytes in Solidity
  composeMsg: Hex; // bytes in Solidity
  onftCmd: Hex; // bytes in Solidity
}

export function useStarshipContract(network: NetworkKey) {
  const contractAddress = CONTRACT_ADDRESSES[network];
  const chain = network === 'base-sepolia' ? baseSepolia : arbitrumSepolia;

  const pubClient = publicClients[chain.id];
  const walletClient = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const { address: userAddress } = useAccount();

  return useMemo(() => {
    return {
      address: contractAddress,
      chain,
      async readBalanceOf(owner: Address) {
        return pubClient.readContract({
          abi: STARSHIP_ABI as any,
          address: contractAddress,
          functionName: 'balanceOf',
          args: [owner],
        }) as Promise<bigint>;
      },
      async mint(to: Address, amount: bigint) {
        const wallet = walletClient.data;
        if (!wallet) throw new Error('Wallet not available');
        if (wallet.chain?.id !== chain.id) {
          await switchChainAsync({ chainId: chain.id });
        }
        const data = encodeFunctionData({
          abi: STARSHIP_ABI as any,
          functionName: 'mint',
          args: [to, amount],
        });
        const fromAccount = to;
        return wallet.sendTransaction({
          to: contractAddress,
          data: data as Hex,
          account: fromAccount,
          chain,
        });
      },
      async ownerOf(tokenId: bigint) {
        return pubClient.readContract({
          abi: STARSHIP_ABI as any,
          address: contractAddress,
          functionName: 'ownerOf',
          args: [tokenId],
        }) as Promise<Address>;
      },
      async tokenURI(tokenId: bigint) {
        return pubClient.readContract({
          abi: STARSHIP_ABI as any,
          address: contractAddress,
          functionName: 'tokenURI',
          args: [tokenId],
        }) as Promise<string>;
      },
      async quoteSend(params: {
        dstEid: number;
        tokenId: bigint;
        composerAddress: `0x${string}`;
        playerId: number;
        extraOptions?: Hex;
      }) {
        // Build the compose message: abi.encode(playerId, tokenId)
        // This matches what MyONFT721ComposerMock.lzCompose expects
        const composeMsg = encodeAbiParameters(
          [{ type: 'uint8' }, { type: 'uint256' }],
          [params.playerId, params.tokenId]
        );

        // Create LayerZero options similar to sendNftCompose.ts
        // Options.newOptions().addExecutorLzReceiveOption(300000, 0).addExecutorComposeOption(0, 700_000, 0.00045 * 10 ** 18).toBytes()
        const options = params.extraOptions ?? '0x';

        const sendParam: SendParam = {
          dstEid: params.dstEid,
          to: toBytes32(params.composerAddress as Address),
          tokenId: params.tokenId,
          extraOptions: options,
          composeMsg: composeMsg,
          onftCmd: '0x',
        };

        return pubClient.readContract({
          abi: STARSHIP_ABI as any,
          address: contractAddress,
          functionName: 'quoteSend',
          args: [sendParam, false],
        }) as Promise<{ nativeFee: bigint; lzTokenFee: bigint }>;
      },
      async send(params: {
        dstEid: number;
        tokenId: bigint;
        feeNative: bigint;
        refundAddress: Address;
        composerAddress: `0x${string}`;
        playerId: number;
        extraOptions?: Hex;
      }) {
        const wallet = walletClient.data;
        if (!wallet) throw new Error('Wallet not available');
        if (wallet.chain?.id !== chain.id) {
          await switchChainAsync({ chainId: chain.id });
        }

        // Build the compose message: abi.encode(playerId, tokenId)
        // This matches what MyONFT721ComposerMock.lzCompose expects
        const composeMsg = encodeAbiParameters(
          [{ type: 'uint8' }, { type: 'uint256' }],
          [params.playerId, params.tokenId]
        );

        // Create LayerZero options similar to sendNftCompose.ts
        // Options.newOptions().addExecutorLzReceiveOption(300000, 0).addExecutorComposeOption(0, 700_000, 0.00045 * 10 ** 18).toBytes()
        const options = params.extraOptions ?? '0x';

        const sendParam: SendParam = {
          dstEid: params.dstEid,
          to: toBytes32(params.composerAddress as Address),
          tokenId: params.tokenId,
          extraOptions: options,
          composeMsg: composeMsg,
          onftCmd: '0x',
        };
        const fee = { nativeFee: params.feeNative, lzTokenFee: 0n } as const;
        const data = encodeFunctionData({
          abi: STARSHIP_ABI as any,
          functionName: 'send',
          args: [sendParam, fee, params.refundAddress, params.composerAddress],
        });
        const fromAccount = params.refundAddress;
        return wallet.sendTransaction({
          to: contractAddress,
          data: data as Hex,
          value: params.feeNative,
          account: fromAccount,
          chain,
        });
      },
    };
  }, [contractAddress, chain, pubClient, walletClient.data, switchChainAsync]);
}

export function toBytes32(address: Address): Hex {
  return `0x000000000000000000000000${address.slice(2)}` as Hex;
}
