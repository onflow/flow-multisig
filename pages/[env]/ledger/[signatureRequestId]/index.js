import {
    Box,
    Heading,
    Flex,
    Icon,
    Text,
    Stack,
    FormControl,
    Input,
    FormErrorMessage,
    Button,
    VStack,
    HStack,
    useClipboard,
    Link
  } from "@chakra-ui/react";
  import { useRouter } from "next/router";
  import { useEffect, useState } from "react";
  import { encodeVoucherToEnvelope } from "../../../../utils/fclCLI";
  import { decode } from "rlp";
  import useSWR from "swr";
  import QRCode from "react-qr-code";
  
  import * as fcl from "@onflow/fcl";
  
  const fetcher = (...args) => fetch(...args).then((res) => res.json());
  
  const iconFn = (color) =>
    function CustomIcon() {
      return (
        <Icon viewBox="0 0 200 200" color={color}>
          <path
            fill="currentColor"
            d="M 100, 100 m -75, 0 a 75,75 0 1,0 150,0 a 75,75 0 1,0 -150,0"
          />
        </Icon>
      );
    };
  
  const GreenDot = iconFn("green.500");
  const RedDot = iconFn("red.500");
  
  export default function SignatureRequestPage() {
    const [rlpStatusMessage, setRLPStatusMessage] = useState("");
    const router = useRouter();
    const { signatureRequestId } = router.query;
    const [cliData, setCliData] = useState("");
    const { hasCopied, onCopy } = useClipboard(cliData);
  
  
    const [currentUser, setCurrentUser] = useState({
      loggedIn: false,
    });
    useEffect(() => {
      fcl.currentUser.subscribe((currentUser) => setCurrentUser(currentUser));
    }, []);
  
    const { data } = useSWR(`/api/${signatureRequestId}`, fetcher, {
      refreshInterval: 3,
    });
  
    const signatures = data ? data.data : [];
  
    // Get the keys
    useEffect(
      () => async () => {
        if (currentUser && signatures?.length > 0) {
          console.log("currentUser", currentUser, signatures?.length);
        }
      },
      [currentUser, signatures]
    );
  
    // Deal with dat flash and/or bad sig request id.
    if (signatures.length === 0) {
      return (
        <Stack margin={"50"}>
          <Flex
            flex="1"
            borderWidth="1px"
            borderRadius="lg"
            overflow="hidden"
            padding="4"
          >
            <Text>
              There does not appear to be an active signature request id
              {signatureRequestId}
            </Text>
          </Flex>
        </Stack>
      );
    }
  
    // The voucher is the same for all these. Doesn't matter which we pick here.
    const cliRLP = encodeVoucherToEnvelope({
      ...signatures[0].signable.voucher,
      envelopeSigs: [],
      payloadSigs: [],
    });
  
    const onRLPChange = async (e) => {
      setRLPStatusMessage("");
      try {
        // This just confirms it is a valid encoding.
        decode("0x" + e.target.value);
  
        setRLPStatusMessage("Updating signature.....");
        await fetch(`/api/${signatureRequestId}/envelope`, {
          method: "post",
          body: JSON.stringify({ envelope: e.target.value }),
          headers: {
            "Content-Type": "application/json",
          },
        }).then((r) => r.json());
  
        setRLPStatusMessage("Signature Updated.");
      } catch (e) {
        console.error(e);
        setRLPStatusMessage("Could not decode");
      }
    };
  
    const signTheMessage = (signable) => async () => {

        console.log("Ledger signing message")
    };
  
    const AuthedState = () => {
      return (
        <VStack>
          <Stack>Hello</Stack>
          <Stack direction="row" spacing={4} align="center">
            <div>Address: {currentUser?.addr ?? "No Address"}</div>
            <Button onClick={fcl.unauthenticate}>Log Out</Button>
          </Stack>
        </VStack>
      );
    };
  
    const UnauthenticatedState = () => {
      return (
        <VStack>
          <Stack direction="row" spacing={4} align="center">
            Hello Ledger User
          </Stack>
        </VStack>
      );
    };
  
    return (
      <Stack margin="4" alignContent="left">
        <Stack maxW="container.xl" align="start">
          <Stack>
            <Heading>Sign with Ledger wallet</Heading>
          </Stack>
          <Stack maxW="container.xl">
            User Address:
            {/* show user address here */}
          </Stack>
        </Stack>
        <Stack>
          <Heading>Key status</Heading>
          {signatures.map(({ address, sig, keyId, signable }) => {
            return (
              <HStack
                flex="1"
                borderWidth="1px"
                borderRadius="lg"
                overflow="hidden"
                padding="4"
                key={address + keyId}
              >
                <Button width="200px" onClick={signTheMessage(signable)}>
                  Sign the message!
                </Button>
  
                <HStack>
                  <Box>{sig ? <GreenDot /> : <RedDot />} </Box>
                  <Text>{fcl.withPrefix(address)}</Text>-<Text>{keyId}</Text>
                </HStack>
              </HStack>
            );
          })}
        </Stack>
        <Stack>
          <HStack>
            <Heading>CLI Entry</Heading>
            <Button onClick={() => {
              setCliData(cliRLP);
              onCopy();
            }}>{hasCopied ? 'Copied!' : 'Copy'}</Button>
          </HStack>
          <Text>{cliRLP}</Text>
        </Stack>
        <Stack>
          <FormControl id="selected-account-payload">
            <Heading>Paste signed rlp here</Heading>
            <Input size="lg" onChange={onRLPChange} />
            {rlpStatusMessage}
            {!!rlpStatusMessage ? (
              <FormErrorMessage>{rlpStatusMessage}</FormErrorMessage>
            ) : (
              <div> </div>
            )}
          </FormControl>
        </Stack>
      </Stack>
    );
  }
  