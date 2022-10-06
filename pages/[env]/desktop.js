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
import { send as httpSent } from "@onflow/transport-http";

const MAINNET = "mainnet";
export default function Desktop() {
    const [txs, setTxs] = useState(['bob', 'sue']);
    const [signed, setSigned] = useState(['done one', 'done two'])
    const [selectedTx, setSelectedTx] = useState(null);
    const [publicKey, setPublicKey] = useState(null);
    const [currentUserAddr, setCurrentUserAddr] = useState(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(async () => {
        console.log('add new fcl configuration')
        fcl.config({
            "sdk.transport": httpSent,
            "0xFUNGIBLETOKENADDRESS": "0xf233dcee88fe0abe",
            "0xFLOWTOKENADDRESS": "0x1654653399040a61",
            "app.detail.icon": "https://flow-multisig-git-service-account-onflow.vercel.app/icon.png",
            "app.detail.title": "Multisig Webapp",
          })
          .put("0xFLOWTOKENADDRESS", "0x1654653399040a61")
          .put("0xLOCKEDTOKENADDRESS", "0x8d0e87b65159ae63")
          .put("0xLOCKEDTOKENADMIN", "0x8d0e87b65159ae63")
          .put("0xSTAKINGPROXYADDRESS", "0x62430cf28c26d095")
          .put("0xFUNGIBLETOKENADDRESS", "0xf233dcee88fe0abe")
          .put("0xIDENTITYTABLEADDRESS", "0x8624b52f9ddcd04a")
          .put("0xFLOWSERVICEACCOUNT", "0xe467b9dd11fa00df")
          .put("0xSTORAGEFEESADDRESS", "0xe467b9dd11fa00df")
          .put("0xFUSDADDRESS", "0x3c5959b568896393")
          .put("0xSTAKINGCOLLECTIONADDRESS", "0x8d0e87b65159ae63")
          .put("0xEPOCHADDRESS", "0x8624b52f9ddcd04a")
          .put("0xTOPSHOT", "0x0b2a3299cc857e29")
          .put("0xNONFUNGIBLETOKEN", "0x1d7e57aa55817448")
          .put("0xUSDCADDRESS", "0xb19436aae4d94622")
          .put("challenge.handshake", "https://fcl-discovery.onflow.org/authn")
          .put("discovery.wallet", "https://fcl-discovery.onflow.org/authn")
          .put("discovery.authn.endpoint", "https://fcl-discovery.onflow.org/authn" )
          .put("accessNode.api", "https://rest-mainnet.onflow.org")
          .put("env", MAINNET)
          .put("flow.network", MAINNET)
          .put("discovery.authn.include", ["0xe5cd26afebe62781", "0x9d2e44203cb13051"])
          fcl.currentUser().subscribe(currentUser => setCurrentUserAddr(currentUser.addr ? fcl.withPrefix(currentUser.addr) : null))
        console.log('set new discovery wallet ')
    }, [])

    const logout = async () => fcl.unauthenticate();
    const login = async () => {
        console.log('logging in')
        try {
            fcl.authenticate()
        }catch(e){
            console.log(e)
        }        
    }

    return (
        <Stack margin="0.25rem" height={"99vh"} overflowY="hidden">
            <Grid
                templateAreas={`"header header"
                  "nav main"
                  "done main"`}
                gridTemplateRows={'50px 50% 1fr'}
                gridTemplateColumns={'1fr 6fr'}
                gap='1'
                color='blackAlpha.700'
                fontWeight='bold'
            >
                <GridItem bg='blue.100' pl='2' area={'header'} padding=".5rem">
                    {!currentUserAddr && <Button size={"sm"} onClick={() => login()}>{publicKey ? `Logged In` : `Login`}</Button>}
                    {currentUserAddr && (<HStack><Button size={"sm"} onClick={() => logout()}>Logout</Button><Text fontSize={"0.75rem"}>{currentUserAddr}</Text></HStack>)}
                </GridItem>
                <GridItem pl='2' height="95vh" bg='blue.100' area={'nav'}>
                    <Stack padding={"1rem"}>
                        <Heading bg="green.100" padding="0.5rem 1rem" size="sm" textAlign={"center"}>PENDING</Heading>
                        {txs.length === 0 && <Heading padding="0.5rem 1rem" size="sm">NO TRANSACTIONS</Heading>}
                        {txs.length > 0 && txs.map((tx) =>
                            <Stack key={tx}>
                                <Button justifyContent={"start"} height="1.5rem" disabled={tx === selectedTx} onClick={() => setSelectedTx(tx)}>{tx}</Button>
                            </Stack>)
                        }
                    </Stack>
                </GridItem>
                <GridItem pl='2' bg='blue.100' area={'main'} rowSpan={2}>
                    <Stack>main</Stack>
                </GridItem>
                <GridItem pl='2' bg='blue.100' area={"done"}>
                    <Stack padding={"1rem"}>
                    <Heading bg="green.100" padding="0.5rem 1rem" width="100%" size="sm" textAlign={"center"}>SIGNED</Heading>
                    {signed.length > 0 && signed.map(s =>
                        <Stack key={s}><Text>{s}</Text></Stack>)
                    }
                    </Stack>
                </GridItem>

            </Grid>
        </Stack>
    )

}