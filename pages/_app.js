import { ChakraProvider } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { setupConfig } from "../config";
import { useEffect } from "react";
import { GoogleOAuthProvider } from '@react-oauth/google';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const { env } = router.query;

  const isLedger = router.pathname.indexOf('ledger') !== -1;

  useEffect(() => setupConfig(env, isLedger), [env, isLedger]);
  // process.env.REACT_APP_GOOGLE_CLIENT_ID
  const clientId = "769260085272-oif0n1ut40vn6p8ldhvp4c4fdkfm3f4d.apps.googleusercontent.com"; //process.env.REACT_APP_GOOGLE_CLIENT_ID;
  return (
      <ChakraProvider>
        <GoogleOAuthProvider clientId={clientId}>
          <Component {...pageProps} />
        </GoogleOAuthProvider>

      </ChakraProvider>
  );
}
export default MyApp;
