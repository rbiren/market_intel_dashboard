import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MsalProvider } from '@azure/msal-react'
import { ApolloProvider } from '@apollo/client/react'
import { msalInstance } from './lib/msal-config'
import { apolloClient } from './lib/apollo-client'
import './index.css'
import App from './App.tsx'

// Initialize MSAL before rendering
msalInstance.initialize().then(() => {
  // Handle redirect callback
  msalInstance.handleRedirectPromise().then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <MsalProvider instance={msalInstance}>
          <ApolloProvider client={apolloClient}>
            <App />
          </ApolloProvider>
        </MsalProvider>
      </StrictMode>,
    )
  })
})
