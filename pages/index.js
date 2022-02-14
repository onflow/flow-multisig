import { Heading, Link, Stack } from "@chakra-ui/react";

export default function MainPage() {
  return (
    <Stack>
      <Heading>Pick your network!</Heading>
      <Link href="./mainnet/">Mainnet</Link>
      <Link href="./testnet/">Testnet</Link>
    </Stack>
  );
}
