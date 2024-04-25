import React, { useEffect, useState } from "react";
import * as fcl from "@onflow/fcl";
import {
  Button,
  HStack,
  Heading,
  Stack,
  Text,
  Select,
  CircularProgress,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import { GCP_WALLET, LOCAL, MAINNET, TESTNET } from "../utils/constants";
import {
  GetPublicKeyAccounts,
  SetupFclConfiguration,
} from "../utils/configurations";
import {
  getPrimaryPublicKeys,
  getUserAccount,
  getUserAccountKeyId,
} from "../utils/accountHelper";
import { abbrvKey, formatDate } from "../utils/formatting";
import { ViewTransactionInfo } from "../components/ViewTransactionInfo";
import { SignOauthGcpTransaction } from "../components/SignOauthGcpTransaction";
import { AddressKeyView } from "../components/AddressKeyView";
import { fetchSignableRequestIds, getCliCommand } from "../utils/kmsHelpers";
import { MessageLink } from "../components/MessageLink";

const networks = [MAINNET, TESTNET, LOCAL];

export default function Dashboard() {
  const [pendingTxs, setPendingTxs] = useState([]);
  const [signedTxs, setSignedTxs] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null); //"496e6c78f2b421de25ede8b240df781273f7fe1177e2d071d06d46c27b6c4564");
  const [network, setNetwork] = useState(MAINNET);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [walletType, setWalletType] = useState(GCP_WALLET);
  const [user, setUser] = useState({ loggedIn: null });

  useEffect(() => SetupFclConfiguration(fcl, network), [network]); // sets the configuration for FCL
  useEffect(() => fcl.currentUser.subscribe(setUser), []); // sets the callback for FCL to use
  useEffect(() => {
    const polling = setInterval(() => {
      if (publicKey) {
        lookUpSignableTransactions(publicKey).then(({ pending, signed }) => {
          // filter out already fetched
          setPendingTxs(pending);
          setSignedTxs(signed);
        });
      }
    }, 5000);
    return () => clearInterval(polling);
  }, [publicKey]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(async () => {
    if (!network || !user?.loggedIn) return;
    if (user?.addr) {
      setLoadingAccounts(true);
      const accts = await processUserAccounts(user);
      if (!accts) {
        setLoadingAccounts(false);
        console.log("no accounts");
        return;
      } 
      setPublicKey(accts.publicKey);
      setAccounts([...accts.accounts] || []);
      const { pending, signed } = await lookUpSignableTransactions(
        accts.publicKey
      );
      setPendingTxs(pending);
      setSignedTxs(signed);
      setLoadingAccounts(false);
    }
  }, [user?.loggedIn, network]);

  const processUserAccounts = async (user) => {
    const address = user.addr;
    if (!address) return;

    const loggedInUserKeyId = await getUserAccountKeyId(user);
    if (loggedInUserKeyId === "" || loggedInUserKeyId === undefined) return;

    const acctWithKeys = await getUserAccount(address);
    let accountInfos = [];
    const publicKey = getPrimaryPublicKeys(acctWithKeys, loggedInUserKeyId);
    const accounts = await GetPublicKeyAccounts(network, publicKey);
    accountInfos = [...accountInfos, ...accounts];
    return { accounts: accountInfos, publicKey };
  };

  const lookUpSignableTransactions = async (publicKey) => {
    let signableIds = [];
    setLoading(true);
    const items = await fetchSignableRequestIds(publicKey);
    const requests = items?.data.map((i) => ({ ...i }));

    signableIds = [...signableIds, ...(requests || [])];
    const allPending = signableIds.filter((t) => !t.sig);
    // filter out old pending signables. 15 minutes older than now, time is in UTC
    // example created_at: "2024-04-23T23:01:54.934342+00:00"
    const now = new Date();
    const fifteenMinutes = 15 * 60 * 1000;
    const fifteenMinutesAgo = new Date(now - fifteenMinutes);
    const pending = allPending.filter((t) => new Date(t.created_at) > fifteenMinutesAgo);

    console.log("pending", allPending, "valid", pending);

    const signed = signableIds.filter((t) => !!t.sig);
    setLoading(false);
    return { pending, signed };
  };

  const pickNetwork = async (network) => {
    setAccounts([]);
    setNetwork(network);
  };

  const logout = async () => {
    fcl.unauthenticate();
    setPublicKey(null);
    setAccounts([]);
    setSignedTxs([]);
    setPendingTxs([]);
    setSelectedTx(null);
  };
  const login = async () => {
    try {
      fcl.unauthenticate();
      fcl.authenticate();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Stack margin="0.25rem" height={"99vh"} overflowY="hidden">
      <Grid
        templateAreas={`"header header"
                  "accts main"
                  "nav main"
                  "done main"`}
        gridTemplateRows={"50px 10% 30% 1fr"}
        gridTemplateColumns={"1fr 6fr"}
        gap="1"
        color="blackAlpha.700"
        fontWeight="bold"
        height={"100%"}
      >
        <GridItem bg="blue.100" pl="2" area={"header"} padding=".5rem">
          <HStack>
            <Select
              size={"sm"}
              width="120px"
              id="network"
              value={network}
              onChange={(e) => pickNetwork(e.target.value)}
            >
              {networks.map((n) => (
                <option key={n} value={n} selected>
                  {n}
                </option>
              ))}
            </Select>
            {!publicKey && (
              <Button size={"sm"} onClick={() => login()}>
                Log In
              </Button>
            )}
            {publicKey && (
              <HStack>
                <Button size={"sm"} onClick={() => logout()}>
                  Logout
                </Button>
                <Text fontSize={"0.75rem"}>
                  Public Key: {abbrvKey(publicKey)} ({walletType})
                </Text>
              </HStack>
            )}
          </HStack>
        </GridItem>
        <GridItem pl="2" bg="blue.100" area={"accts"}>
          <Stack padding={"1rem"} height="100%" overflow="auto">
            <Heading
              bg="green.100"
              padding="0 0.25rem"
              size="sm"
              textAlign={"center"}
            >
              ACCOUNTS{" "}
              {loadingAccounts && (
                <CircularProgress
                  size={"1rem"}
                  isIndeterminate
                  color="green.300"
                />
              )}
            </Heading>
            {accounts.length === 0 && (
              <Heading padding="0.5rem 1rem" size="sm">
                {" "}
                ---{" "}
              </Heading>
            )}
            {accounts.length > 0 &&
              accounts.map((acct) => (
                <Stack key={`${acct.address}${acct.keyId}`}>
                  <HStack justifyContent={"space-between"}>
                    <Text justifyContent={"start"} height="1rem">
                      {abbrvKey(acct.address, 6)}{" "}
                    </Text>
                    <Text justifyContent={"start"} height="1rem">
                      {acct.keyId}{" "}
                    </Text>
                  </HStack>
                </Stack>
              ))}
          </Stack>
        </GridItem>
        <GridItem pl="2" bg="blue.100" area={"nav"}>
          <Stack padding={"1rem"} height="90%" overflow="auto">
            <Heading
              bg="green.100"
              padding="0 0.25rem"
              size="sm"
              textAlign={"center"}
            >
              PENDING{" "}
              {loading && (
                <CircularProgress
                  size={"1rem"}
                  isIndeterminate
                  color="green.300"
                />
              )}
            </Heading>

            {pendingTxs.length === 0 && (
              <Heading padding="0.5rem 1rem" size="sm">
                {" "}
                ---{" "}
              </Heading>
            )}
            {publicKey &&
              pendingTxs.length > 0 &&
              pendingTxs.map((tx) => (
                <Stack key={tx}>
                  <Button
                    justifyContent={"start"}
                    height="1.5rem"
                    disabled={tx === selectedTx}
                    onClick={() => setSelectedTx(tx)}
                  >
                    {abbrvKey(tx.signatureRequestId, 5)}
                  </Button>
                </Stack>
              ))}
          </Stack>
        </GridItem>
        <GridItem pl="2" bg="blue.100" area={"main"} rowSpan={3}>
          {user?.addr && selectedTx !== null && (
            <Stack padding="0.5rem">
              <Text padding="0 0.5rem" bg="green.100">
                {formatDate(selectedTx.created_at)}
              </Text>
              <AddressKeyView {...selectedTx} />
              <HStack>
                <Text fontSize="12px" paddingRight={"2px"}>
                  RequestId:
                </Text>
                <Text>{abbrvKey(selectedTx.signatureRequestId)}</Text>
              </HStack>
              <MessageLink
                link={getCliCommand(selectedTx.signatureRequestId)}
                message={"FLOW CLI"}
                bg="none"
              />
              <ViewTransactionInfo {...selectedTx} />
              {selectedTx && !selectedTx.sig && (
                <SignOauthGcpTransaction {...selectedTx} />
              )}
            </Stack>
          )}
        </GridItem>
        <GridItem pl="2" bg="blue.100" area={"done"} overflowY="scroll">
          <Stack height="50vh" overflow="auto" padding={"1rem"}>
            <Heading
              bg="green.100"
              padding="0 0.25rem"
              width="100%"
              size="sm"
              textAlign={"center"}
            >
              SIGNED
            </Heading>
            {signedTxs.length === 0 && (
              <Heading padding="0.5rem 1rem" size="sm">
                {" "}
                ---{" "}
              </Heading>
            )}
            {user?.addr &&
              signedTxs.length > 0 &&
              signedTxs.map((s) => (
                <Button
                  cursor={"pointer"}
                  onClick={() => setSelectedTx(s)}
                  key={s}
                >
                  <Text>{abbrvKey(s.signatureRequestId, 5)}</Text>
                </Button>
              ))}
          </Stack>
        </GridItem>
      </Grid>
    </Stack>
  );
}
