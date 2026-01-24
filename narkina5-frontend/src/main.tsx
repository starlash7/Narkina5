import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivyProvider
      appId="cm0bt9r0p0077nmqwfv5sf3kh"
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#ff6b35',
        },
        loginMethods: ['email', 'wallet', 'google', 'twitter'],
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>,
)
