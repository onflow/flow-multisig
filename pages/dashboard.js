import React, { useEffect, useState } from "react";
import * as fcl from "@onflow/fcl"
import {
    Header,
    Tabs,
    TabPanel,
    TabPanels,
    TabList,
    Button,
    FormControl,
    FormErrorMessage,
    HStack,
    FormLabel,
    Heading,
    Input,
    Link,
    Stack,
    Text,
    Select,
    CircularProgress,
    VStack,
    Textarea,
    Grid,
    GridItem,
} from "@chakra-ui/react";
import { GCP_WALLET, LOCAL, MAINNET, TESTNET } from "../utils/constants";
import { GetPublicKeyAccounts, SetupFclConfiguration } from "../utils/configurations";
import { getPrimaryPublicKeys, getUserAccount } from "../utils/accountHelper";
import { abbrvKey } from "../utils/formatting";
import { ViewTransactionInfo } from "../components/ViewTransactionInfo";
import { SignOauthGcpTransaction } from "../components/SignOauthGcpTransaction";
import { AddressKeyView } from "../components/AddressKeyView";

const networks = [MAINNET, TESTNET, LOCAL];

export default function Dashboard() {
    const [pendingTxs, setPendingTxs] = useState([]);
    const [signedTxs, setSignedTxs] = useState([])
    const [selectedTx, setSelectedTx] = useState(null); //"496e6c78f2b421de25ede8b240df781273f7fe1177e2d071d06d46c27b6c4564");
    const [currentUserAddr, setCurrentUserAddr] = useState(null);
    const [network, setNetwork] = useState(MAINNET);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [walletType, setWalletType] = useState(GCP_WALLET)

    useEffect(() => {
        const polling = setInterval(() => {
            if (accounts && accounts.length > 0) {
                setLoading(true)
                lookUpSignableTransactions(accounts)
                    .then(({ pending, signed }) => {
                        // filter out already fetched
                        setPendingTxs(pending);
                        setSignedTxs(signed);
                        setLoading(false)
                    });
            }
        }, 5000)
        return () => clearInterval(polling)
    }, [accounts])

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(async () => {
        fcl.unauthenticate();
        if (!network) return;
        SetupFclConfiguration(fcl, network);
        fcl.currentUser().subscribe(async currentUser => {
            setCurrentUserAddr(currentUser.addr ? fcl.withPrefix(currentUser.addr) : null)
            if (currentUser.addr) {
                console.log('currentUser', currentUser)
                setLoading(true)
                const accountInfos = await processUserAccounts(currentUser.addr);
                setAccounts(accountInfos)
                const { pending, signed } = await lookUpSignableTransactions(accountInfos);
                setPendingTxs(pending)
                setSignedTxs(signed)
                setLoading(false)
            }
        })
    }, [network])

    const processUserAccounts = async (address) => {
        if (!address) return;

        const acct = await getUserAccount(address)
        let accountInfos = []
        const publicKeys = getPrimaryPublicKeys(acct)
        for (let i = 0; i < publicKeys.length; i++) {
            const publicKey = publicKeys[i];
            const accounts = await GetPublicKeyAccounts(network, publicKey);
            accountInfos = [...accountInfos, ...accounts];
        }
        return accountInfos;
    }

    const lookUpSignableTransactions = async (accounts) => {
        let signableIds = []
        for (let i = 0; i < accounts.length; i++) {
            const { address, keyId } = accounts[i];
            const items = await fetchSignableRequestIds(address, keyId);
            // need to keep track of address and keyId with requestId
            const requests = items?.data.map(i => ({...i, address, keyId}));
            signableIds = [...signableIds, ...(requests || [])]
        }
        const pending = signableIds.filter(t => !t.sig);
        const signed = signableIds.filter(t => !!t.sig);
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

    const fetchSignableRequestIds = async (addr, keyId) => {
        const res = await fetch(`/api/pending/${addr}/${keyId}`);
        return res.json();
    }

    return (
        <Stack margin="0.25rem" height={"99vh"} overflowY="hidden">
            <Grid
                templateAreas={`"header header"
                  "nav main"
                  "done main"`}
                gridTemplateRows={'50px 25% 1fr'}
                gridTemplateColumns={'1fr 6fr'}
                gap='1'
                color='blackAlpha.700'
                fontWeight='bold'
            >
                <GridItem bg='blue.100' pl='2' area={'header'} padding=".5rem">
                    <HStack>
                        <Select size={"sm"} width="120px" id="network" value={network} onChange={(e) => setNetwork(e.target.value)}>
                            {networks.map(n => (<option key={n} value={n} selected>{n}</option>))}
                        </Select>
                        {!currentUserAddr && <Button size={"sm"} onClick={() => login()}>Log In</Button>}
                        {currentUserAddr && (<HStack><Button size={"sm"} onClick={() => logout()}>Logout</Button><Text fontSize={"0.75rem"}>{currentUserAddr} ({walletType})</Text></HStack>)}
                    </HStack>
                </GridItem>
                <GridItem pl='2' height="95vh" bg='blue.100' area={'nav'}>
                    <Stack padding={"1rem"} height="50vh" overflow="auto">
                        <Heading bg="green.100" padding="0 0.25rem" size="sm" textAlign={"center"}>PENDING {loading && <CircularProgress size={"1rem"} isIndeterminate color="green.300" />}</Heading>

                        {pendingTxs.length === 0 && <Heading padding="0.5rem 1rem" size="sm"> --- </Heading>}
                        {pendingTxs.length > 0 && pendingTxs.map((tx) =>
                            <Stack key={tx}>
                                <Button justifyContent={"start"} height="1.5rem" disabled={tx === selectedTx} onClick={() => setSelectedTx(tx)}>{abbrvKey(tx.signatureRequestId, 5)}</Button>
                            </Stack>)
                        }
                    </Stack>
                </GridItem>
                <GridItem pl='2' bg='blue.100' area={'main'} rowSpan={2}>
                    {selectedTx &&
                        <Stack>
                            <AddressKeyView {...selectedTx} />
                            <Text>{abbrvKey(selectedTx.signatureRequestId)}</Text>
                            <ViewTransactionInfo {...selectedTx} />
                            {selectedTx && pendingTxs.includes(selectedTx) && (
                                <SignOauthGcpTransaction {...selectedTx} />
                            )}
                        </Stack>
                    }

                </GridItem>
                <GridItem pl='2' bg='blue.100' area={"done"} overflowY="scroll">
                    <Stack height="50vh" overflow="auto" padding={"1rem"}>
                        <Heading bg="green.100" padding="0 0.25rem" width="100%" size="sm" textAlign={"center"}>SIGNED</Heading>
                        {signedTxs.length === 0 && <Heading padding="0.5rem 1rem" size="sm"> --- </Heading>}
                        {signedTxs.length > 0 && signedTxs.map(s =>
                            <Button cursor={"pointer"} onClick={() => setSelectedTx(s)} key={s}><Text>{abbrvKey(s.signatureRequestId, 5)}</Text></Button>)
                        }
                    </Stack>
                </GridItem>

            </Grid>
        </Stack>
    )

}