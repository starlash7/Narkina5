import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { usePrivy } from '@privy-io/react-auth';

// AgenC Program ID (deployed on devnet/mainnet)
const AGENC_PROGRAM_ID = 'EopUaCV2svxj9j4hd7KjbrWfdjkspmm2BCBe7jGpKzKZ';

interface SolanaContextType {
    connection: Connection;
    publicKey: PublicKey | null;
    balance: number | null;
    isLoading: boolean;
    error: string | null;
    refreshBalance: () => Promise<void>;
    network: 'devnet' | 'mainnet';
}

const SolanaContext = createContext<SolanaContextType | null>(null);

// Use devnet for development
const NETWORK = 'devnet';
const RPC_ENDPOINT = 'https://api.devnet.solana.com';

export function SolanaProvider({ children }: { children: ReactNode }) {
    const { user, authenticated } = usePrivy();
    const [connection] = useState(() => new Connection(RPC_ENDPOINT, 'confirmed'));
    const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
    const [balance, setBalance] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        }
    }, [authenticated, user?.wallet?.address]);

    // Fetch balance when publicKey changes
    useEffect(() => {
        if (publicKey) {
            refreshBalance();
        }
    }, [publicKey]);

    const refreshBalance = async () => {
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
    };

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
