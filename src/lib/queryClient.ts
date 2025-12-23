import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient instance for the entire application.
 * Exported separately to avoid circular imports between App.tsx and AuthContext.
 * 
 * This client is used by:
 * - App.tsx: QueryClientProvider
 * - AuthContext: Clear cache on auth state changes
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Don't refetch on window focus by default
            refetchOnWindowFocus: false,
            // Keep data fresh for 30 seconds
            staleTime: 30 * 1000,
            // Retry failed requests once
            retry: 1,
        },
    },
});
