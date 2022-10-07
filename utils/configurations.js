import { CANARYNET, MAINNET, SANDBOXNET, TESTNET, LOCAL } from "./constants"

export const SetupFclConfiguration = (fcl, network) => {
    console.log('using ', network)
    switch (network) {
        case TESTNET: {

            fcl.config()
                .put("0xFLOWTOKENADDRESS", "0x7e60df042a9c0868")
                .put("0xLOCKEDTOKENADDRESS", "0x95e019a17d0e23d7")
                .put("0xLOCKEDTOKENADMIN", "0x95e019a17d0e23d7")
                .put("0xSTAKINGPROXYADDRESS", "0x7aad92e5a0715d21")
                .put("0xFUNGIBLETOKENADDRESS", "0x9a0766d93b6608b7")
                .put("0xIDENTITYTABLEADDRESS", "0x9eca2b38b18b5dfe")
                .put("0xFLOWSERVICEACCOUNT", "0x8c5303eaa26202d6")
                .put("0xSTORAGEFEESADDRESS", "0x8c5303eaa26202d6")
                .put("0xFUSDADDRESS", "0xe223d8a629e49c68")
                .put("0xSTAKINGCOLLECTIONADDRESS", "0x95e019a17d0e23d7")
                .put("0xEPOCHADDRESS", "0x9eca2b38b18b5dfe")
                .put("0xTOPSHOT", "0x877931736ee77cff")
                .put("0xNONFUNGIBLETOKEN", "0x631e88ae7f1d7c20")
                .put("0xUSDCADDRESS", "0xa983fecbed621163")
                .put("challenge.handshake", "https://fcl-discovery.onflow.org/testnet/authn")
                .put("discovery.authn.endpoint", "https://fcl-discovery.onflow.org/testnet/authn")
                .put("accessNode.api", "https://rest-testnet.onflow.org")
                .put("env", TESTNET)
                .put("flow.network", TESTNET)

            break;
        }
        case SANDBOXNET: {
            fcl.config()
                .put("0xFUNGIBLETOKENADDRESS", "0xe20612a0776ca4bf")
                .put("0xFLOWTOKENADDRESS", "0x0661ab7d6696a460")
                .put("0xFLOWSERVICEACCOUNT", "0xf4527793ee68aede")
                .put("0xFUSDADDRESS", "0x6c52cbc80f034d1b")
                .put("0xSTORAGEFEESADDRESS", "0xe92c2039bbe9da96")
                .put("accessNode.api", "https://rest-sandboxnet.onflow.org")
                .put("challenge.handshake", "https://fcl-discovery.onflow.org/testnet/authn")
                .put("discovery.authn.endpoint", "https://fcl-discovery.onflow.org/testnet/authn")
                .put("env", SANDBOXNET)
                .put("flow.network", SANDBOXNET)

            break;
        }
        case LOCAL: {
            fcl.config()
                // testing using mainnet 
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

                //.put("accessNode.api", "http://localhost:8888")
                .put("accessNode.api", "https://rest-mainnet.onflow.org")
                .put("challenge.handshake", "http://localhost:3001/local/authn")
                .put("discovery.authn.endpoint", "http://localhost:3001/local/authn")

                .put("env", LOCAL)
                .put("flow.network", LOCAL)

            break;
        }
        case CANARYNET: {
            fcl.config()
                .put("0xFLOWTOKENADDRESS", "0x7e60df042a9c0868")
                .put("0xLOCKEDTOKENADDRESS", "0x95e019a17d0e23d7")
                .put("0xSTAKINGPROXYADDRESS", "0x7aad92e5a0715d21")
                .put("0xFUNGIBLETOKENADDRESS", "0x9a0766d93b6608b7")
                .put("0xIDENTITYTABLEADDRESS", "0x9eca2b38b18b5dfe")
                .put("0xFLOWSERVICEACCOUNT", "0x8c5303eaa26202d6")
                .put("0xEPOCHADDRESS", "0x9eca2b38b18b5dfe")
                .put("0xTOPSHOT", "0x877931736ee77cff")
                .put("0xNONFUNGIBLETOKEN", "0x631e88ae7f1d7c20")
                .put("challenge.handshake", "https://fcl-discovery.onflow.org/canarynet/authn")
                .put("discovery.authn.endpoint", "https://fcl-discovery.onflow.org/canarynet/authn")
                .put("accessNode.api", "https://canary.onflow.org")
                .put("env", CANARYNET)
                .put("flow.network", CANARYNET)

            break;
        }
        default: {
            fcl.config()
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
                .put("discovery.authn.endpoint", "https://fcl-discovery.onflow.org/authn")
                .put("accessNode.api", "https://rest-mainnet.onflow.org")
                //.put("challenge.handshake", "http://localhost:3000/local/authn")
                .put("env", MAINNET)
                .put("flow.network", MAINNET)
            break;
        }
    }
    fcl.config()
        .put("discovery.authn.include", ["0xe5cd26afebe62781", "0x9d2e44203cb13051"])
        .put("app.detail.icon", "https://port.onflow.org/favicon/favicon-32x32.png")
        .put("app.detail.title", "Flow Port")

}

export const GetPublicKeyAccounts = async (network, publicKey) => {
    let url = `https://key-indexer.production.flow.com/key/${publicKey}`
    if (network === TESTNET) {
        url = `https://key-indexer.staging.flow.com/key/${publicKey}`
    }
    const result = await fetch(url).then((r) => r.json());
    return result?.accounts || []
}
