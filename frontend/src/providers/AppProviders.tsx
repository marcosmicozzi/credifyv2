import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { AuthProvider } from './AuthProvider'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

