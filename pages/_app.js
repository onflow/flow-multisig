import { ChakraProvider } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { setupConfig } from "../config";
import { useEffect } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary"

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const { env } = router.query;

  const isLedger = router.pathname.indexOf('ledger') !== -1;

  useEffect(() => setupConfig(env, isLedger), [env, isLedger]);
  return (
    <ChakraProvider>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </ChakraProvider>
  );
}
export default MyApp;
