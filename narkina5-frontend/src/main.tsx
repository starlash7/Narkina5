import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana'
import { SolanaProvider } from './contexts/SolanaContext'
import './index.css'
import App from './App.tsx'

const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: false,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivyProvider
      appId="cm0bt9r0p0077nmqwfv5sf3kh"
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#ff6b35',
          walletChainType: 'solana-only',
        },
        loginMethods: ['email', 'wallet', 'google', 'twitter'],
        externalWallets: {
          solana: { connectors: solanaConnectors },
        },
      }}
    >
      <SolanaProvider>
        <App />
      </SolanaProvider>
    </PrivyProvider>
  </StrictMode>,
)
