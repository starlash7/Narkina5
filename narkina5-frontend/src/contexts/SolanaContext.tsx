import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { checkAgentRegistered, deriveAgentIdFromWallet } from '../services/transactions';

// AgenC Program ID (deployed on devnet)
const AGENC_PROGRAM_ID = 'EopUaCV2svxj9j4hd7KjbrWfdjkspmm2BCBe7jGpKzKZ';

interface SolanaContextType {
    connection: Connection;
    publicKey: PublicKey | null;
    balance: number | null;
    isLoading: boolean;
    error: string | null;
    refreshBalance: () => Promise<void>;
    network: 'devnet' | 'mainnet';
    sendTransaction: (serializedTx: Uint8Array) => Promise<string>;
    isAgentRegistered: boolean;
    checkAgentStatus: () => Promise<void>;
}

const SolanaContext = createContext<SolanaContextType | null>(null);

// Use devnet for development
const NETWORK = 'devnet';
const RPC_ENDPOINT = 'https://api.devnet.solana.com';

export function SolanaProvider({ children }: { children: ReactNode }) {
    const { user, authenticated } = usePrivy();
    const { wallets } = useWallets();
    const { signTransaction } = useSignTransaction();
    const [connection] = useState(() => new Connection(RPC_ENDPOINT, 'confirmed'));
    const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
    const [balance, setBalance] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAgentRegistered, setIsAgentRegistered] = useState(false);

    // Get wallet address from Privy user
    useEffect(() => {
        if (authenticated && user?.wallet?.address) {
            try {
                const pk = new PublicKey(user.wallet.address);
                setPublicKey(pk);
                setError(null);
            } catch (err) {
                console.error('Invalid wallet address:', err);
                setPublicKey(null);
                setError('Invalid wallet address');
            }
        } else {
            setPublicKey(null);
            setBalance(null);
            setIsAgentRegistered(false);
        }
    }, [authenticated, user?.wallet?.address]);

    // Fetch balance and agent status when publicKey changes
    useEffect(() => {
        if (publicKey) {
            refreshBalance();
            checkAgentStatus();
        }
    }, [publicKey]);

    const refreshBalance = useCallback(async () => {
        if (!publicKey) return;

        setIsLoading(true);
        setError(null);

        try {
            const lamports = await connection.getBalance(publicKey);
            setBalance(lamports / LAMPORTS_PER_SOL);
        } catch (err) {
            console.error('Failed to fetch balance:', err);
            setError('Failed to fetch balance');
            setBalance(null);
        } finally {
            setIsLoading(false);
        }
    }, [publicKey, connection]);

    const checkAgentStatus = useCallback(async () => {
        if (!publicKey) return;
        try {
            const agentId = deriveAgentIdFromWallet(publicKey);
            const registered = await checkAgentRegistered(connection, agentId);
            setIsAgentRegistered(registered);
        } catch (err) {
            console.error('Failed to check agent status:', err);
            setIsAgentRegistered(false);
        }
    }, [publicKey, connection]);

    const sendTransaction = useCallback(async (serializedTx: Uint8Array): Promise<string> => {
        const wallet = wallets.find(w => w.address === publicKey?.toBase58());
        if (!wallet) throw new Error('No wallet connected');

        // Sign with Privy wallet
        const { signedTransaction } = await signTransaction({
            transaction: serializedTx,
            wallet,
            chain: 'solana:devnet',
        });

        // Send and confirm
        const latestBlockhash = await connection.getLatestBlockhash('confirmed');
        const signature = await connection.sendRawTransaction(signedTransaction);
        await connection.confirmTransaction({
            signature,
            ...latestBlockhash,
        }, 'confirmed');

        return signature;
    }, [wallets, publicKey, signTransaction, connection]);

    return (
        <SolanaContext.Provider
            value={{
                connection,
                publicKey,
                balance,
                isLoading,
                error,
                refreshBalance,
                network: NETWORK,
                sendTransaction,
                isAgentRegistered,
                checkAgentStatus,
            }}
        >
            {children}
        </SolanaContext.Provider>
    );
}

export function useSolana() {
    const context = useContext(SolanaContext);
    if (!context) {
        throw new Error('useSolana must be used within a SolanaProvider');
    }
    return context;
}

// Export constants for use in other components
export { AGENC_PROGRAM_ID, RPC_ENDPOINT, NETWORK };
