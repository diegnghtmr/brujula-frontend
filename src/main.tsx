import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AppRouter } from "@/routes";
import "@/styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 30s — avoids redundant refetches for catalog data
      staleTime: 30_000,
      // Retry once on failure (not 3 times)
      retry: 1,
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    {/* TanStack Query provider — must wrap entire app */}
    <QueryClientProvider client={queryClient}>
      {/* Theme provider — persists light/dark preference */}
      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
      {/* React Query Devtools — dev only, tree-shaken in production */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
