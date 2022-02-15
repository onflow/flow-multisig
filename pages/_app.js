import { ChakraProvider } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { setupConfig } from "../config";
import { useEffect } from "react";

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const { env } = router.query;

  useEffect(() => setupConfig(env), [env]);

  return (
    <ChakraProvider>
      <Component {...pageProps} />
    </ChakraProvider>
  );
}
export default MyApp;
