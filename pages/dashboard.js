import React, { useEffect, useState } from "react";
import * as fcl from "@onflow/fcl"
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
import { GetPublicKeyAccounts, SetupFclConfiguration } from "../utils/configurations";
import { getPrimaryPublicKeys, getUserAccount } from "../utils/accountHelper";
import { abbrvKey, formatDate } from "../utils/formatting";
import { ViewTransactionInfo } from "../components/ViewTransactionInfo";
import { SignOauthGcpTransaction } from "../components/SignOauthGcpTransaction";
import { AddressKeyView } from "../components/AddressKeyView";
import { fetchSignableRequestIds, getCliCommand } from "../utils/kmsHelpers";
import { MessageLink } from "../components/MessageLink";

const networks = [MAINNET, TESTNET, LOCAL];

export default function Dashboard() {
    const [pendingTxs, setPendingTxs] = useState([]);
    const [signedTxs, setSignedTxs] = useState([])
    const [selectedTx, setSelectedTx] = useState(null); //"496e6c78f2b421de25ede8b240df781273f7fe1177e2d071d06d46c27b6c4564");
    const [currentUserAddr, setCurrentUserAddr] = useState(null);
    const [network, setNetwork] = useState(MAINNET);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [publicKey, setPublicKey] = useState(null);
    const [walletType, setWalletType] = useState(GCP_WALLET)

    useEffect(() => {
        const polling = setInterval(() => {
            if (publicKey && currentUserAddr) {
                lookUpSignableTransactions(publicKey)
                    .then(({ pending, signed }) => {
                        // filter out already fetched
                        setPendingTxs(pending);
                        setSignedTxs(signed);
                    })
            }
        }, 5000)
        return () => clearInterval(polling)
    }, [publicKey, currentUserAddr])

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(async () => {
        fcl.unauthenticate();
        if (!network) return;
        SetupFclConfiguration(fcl, network);
        fcl.currentUser().subscribe(async currentUser => {
            setCurrentUserAddr(currentUser.addr ? fcl.withPrefix(currentUser.addr) : null)
            if (currentUser.addr) {
                console.log('currentUser', currentUser)
                setLoadingAccounts(true)
                const accts = await processUserAccounts(currentUser.addr);
                setPublicKey(accts.publicKey)
                setAccounts(accts.accounts || [])
                const { pending, signed } = await lookUpSignableTransactions(accts.publicKey);
                setPendingTxs(pending)
                setSignedTxs(signed)
                setLoadingAccounts(false)
            }
        })
    }, [network])

    const processUserAccounts = async (address) => {
        if (!address) return;

        const acct = await getUserAccount(address)
        let accountInfos = []
        const publicKeys = getPrimaryPublicKeys(acct)
        const pk = publicKeys.length === 1 ? publicKeys[0] : null;
        for (let i = 0; i < publicKeys.length; i++) {
            const publicKey = publicKeys[i];
            const accounts = await GetPublicKeyAccounts(network, publicKey);
            accountInfos = [...accountInfos, ...accounts];
        }
        return { accounts: accountInfos, publicKey: pk };
    }

    const lookUpSignableTransactions = async (publicKey) => {
        let signableIds = []
        setLoading(true)
        const items = await fetchSignableRequestIds(publicKey);
        const requests = items?.data.map(i => ({ ...i }));
        signableIds = [...signableIds, ...(requests || [])]
        const pending = signableIds.filter(t => !t.sig);
        const signed = signableIds.filter(t => !!t.sig);
        setLoading(false)
        return { pending, signed };
    }

    const logout = async () => fcl.unauthenticate();
    const login = async () => {
        console.log('logging in')
        try {
            fcl.authenticate()
        } catch (e) {
            console.log(e)
        }
    }

    return (
        <Stack margin="0.25rem" height={"99vh"} overflowY="hidden">
            <Grid
                templateAreas={`"header header"
                  "accts main"
                  "nav main"
                  "done main"`}
                gridTemplateRows={'50px 10% 30% 1fr'}
                gridTemplateColumns={'1fr 6fr'}
                gap='1'
                color='blackAlpha.700'
                fontWeight='bold'
                height={"100%"}
            >
                <GridItem bg='blue.100' pl='2' area={'header'} padding=".5rem">
                    <HStack>
                        <Select size={"sm"} width="120px" id="network" value={network} onChange={(e) => setNetwork(e.target.value)}>
                            {networks.map(n => (<option key={n} value={n} selected>{n}</option>))}
                        </Select>
                        {!currentUserAddr && <Button size={"sm"} onClick={() => login()}>Log In</Button>}
                        {currentUserAddr && (<HStack><Button size={"sm"} onClick={() => logout()}>Logout</Button><Text fontSize={"0.75rem"}>Public Key: {abbrvKey(publicKey)} ({walletType})</Text></HStack>)}
                    </HStack>
                </GridItem>
                <GridItem pl='2' bg='blue.100' area={'accts'}>
                    <Stack padding={"1rem"} height="100%" overflow="auto">
                        <Heading bg="green.100" padding="0 0.25rem" size="sm" textAlign={"center"}>ACCOUNTS {loadingAccounts && <CircularProgress size={"1rem"} isIndeterminate color="green.300" />}</Heading>
                        {accounts.length === 0 && <Heading padding="0.5rem 1rem" size="sm"> --- </Heading>}
                        {currentUserAddr && accounts.map((acct) =>
                            <Stack key={`${acct.address}${acct.keyId}`}>
                                <HStack justifyContent={"space-between"}><Text justifyContent={"start"} height="1rem">{abbrvKey(acct.address, 6)} </Text><Text justifyContent={"start"} height="1rem">{acct.keyId} </Text></HStack>
                            </Stack>)
                        }
                    </Stack>
                </GridItem>
                <GridItem pl='2' bg='blue.100' area={'nav'}>
                    <Stack padding={"1rem"} height="50vh" overflow="auto">
                        <Heading bg="green.100" padding="0 0.25rem" size="sm" textAlign={"center"}>PENDING {loading && <CircularProgress size={"1rem"} isIndeterminate color="green.300" />}</Heading>

                        {pendingTxs.length === 0 && <Heading padding="0.5rem 1rem" size="sm"> --- </Heading>}
                        {currentUserAddr && pendingTxs.length > 0 && pendingTxs.map((tx) =>
                            <Stack key={tx}>
                                <Button justifyContent={"start"} height="1.5rem" disabled={tx === selectedTx} onClick={() => setSelectedTx(tx)}>{abbrvKey(tx.signatureRequestId, 5)}</Button>
                            </Stack>)
                        }
                    </Stack>
                </GridItem>
                <GridItem pl='2' bg='blue.100' area={'main'} rowSpan={3}>
                    {currentUserAddr && selectedTx !== null &&
                        <Stack padding="0.5rem">
                            <Text padding="0 0.5rem" bg="green.100">{formatDate(selectedTx.created_at)}</Text>
                            <AddressKeyView {...selectedTx} />
                            <HStack>
                                <Text fontSize="12px" paddingRight={"2px"}>RequestId:</Text>
                                <Text>{abbrvKey(selectedTx.signatureRequestId)}</Text>
                            </HStack>
                            <MessageLink link={getCliCommand(selectedTx.signatureRequestId)} message={"FLOW CLI"} bg="none"/>
                            <ViewTransactionInfo {...selectedTx} />
                            {selectedTx && !selectedTx.sig && (
                                <SignOauthGcpTransaction {...selectedTx} />
                            )}
                        </Stack>
                    }

                </GridItem>
                <GridItem pl='2' bg='blue.100' area={"done"} overflowY="scroll">
                    <Stack height="50vh" overflow="auto" padding={"1rem"}>
                        <Heading bg="green.100" padding="0 0.25rem" width="100%" size="sm" textAlign={"center"}>SIGNED</Heading>
                        {signedTxs.length === 0 && <Heading padding="0.5rem 1rem" size="sm"> --- </Heading>}
                        {currentUserAddr && signedTxs.length > 0 && signedTxs.map(s =>
                            <Button cursor={"pointer"} onClick={() => setSelectedTx(s)} key={s}><Text>{abbrvKey(s.signatureRequestId, 5)}</Text></Button>)
                        }
                    </Stack>
                </GridItem>
            </Grid>
        </Stack>
    )

}