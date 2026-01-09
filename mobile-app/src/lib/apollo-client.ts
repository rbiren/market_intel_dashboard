import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client/core'
import { setContext } from '@apollo/client/link/context'
import { msalInstance, fabricScopes } from './msal-config'

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_GRAPHQL_ENDPOINT,
})

const authLink = setContext(async (_, { headers }) => {
  try {
    const accounts = msalInstance.getAllAccounts()
    if (accounts.length === 0) {
      return { headers }
    }

    const response = await msalInstance.acquireTokenSilent({
      ...fabricScopes,
      account: accounts[0],
    })

    return {
      headers: {
        ...headers,
        Authorization: `Bearer ${response.accessToken}`,
      },
    }
  } catch (error) {
    console.error('Error acquiring token:', error)
    return { headers }
  }
})

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
})
