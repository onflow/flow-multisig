import { CANARYNET, MAINNET, SANDBOXNET, TESTNET, LOCAL } from "./constants"
import { init } from '@onflow/fcl-wc'

export const SetupFclConfiguration = async (fcl, network) => {
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
                //.put("discovery.wallet", "https://fcl-discovery.onflow.org/testnet/authn")
                .put("discovery.wallet", "https://fcl-gcp-kms-web.vercel.app/testnet/authn")
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
                .put("discovery.wallet", "https://fcl-discovery.onflow.org/testnet/authn")
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

                .put("accessNode.api", "https://rest-mainnet.onflow.org")
                //.put("discovery.wallet", "https://fcl-gcp-kms-web.vercel.app/mainnet/authn")
                .put("discovery.wallet", "http://localhost:3001/mainnet/authn")                
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
                //.put("discovery.wallet", "https://fcl-discovery.onflow.org/canarynet/authn")
                .put("discovery.wallet", "https://fcl-gcp-kms-web.vercel.app/canarynet/authn")
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
                //.put("discovery.wallet", "https://fcl-discovery.onflow.org/authn")
                // use gcp as primary
                .put("discovery.wallet", "https://fcl-gcp-kms-web.vercel.app/mainnet/authn")
                //.put("discovery.wallet", "http://localhost:3001/mainnet/authn")
                .put("discovery.authn.endpoint", "https://fcl-discovery.onflow.org/authn")
                .put("accessNode.api", "https://rest-mainnet.onflow.org")
                .put("env", MAINNET)
                .put("flow.network", MAINNET)
            break;
        }
    }

    const gcpKmsWallet = {
        "f_type": "Service",
        "f_vsn": "1.0.0",
        "type": "authn",
        "method": "HTTP/POST",
        "uid": "gcpkms#authn",
        "name": "Gcp Key (kms)",
        "endpoint": `https://fcl-gcp-kms-web.vercel.app/${network}/authn`,
        "provider": {
            "address": "0x3ef2e1c717c26127",
            "name": "Gcp Key (kms)",
            "icon": "data:image/png;base64,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",
            "description": "Sign with google KMS.",
            "color": "#afd8f7",
            "supportEmail": "info@dapperlabs.com",
            "authn_endpoint": `https://fcl-gcp-kms-web.vercel.app/${network}/authn`,
            "website": "https://flow-multisig.vercel.app/"
        }
    }
    const gcpKmsPlugin = {
        name: "fcl-plugin-service-gcpKms",
        f_type: "ServicePlugin",
        type: "discovery-service",
        services: [gcpKmsWallet],
        serviceStrategy: { method: "HTTP/POST", exec: () => { } },
    }
    //const walletConnectPlugin = await setupWC();    
    // TODO: doesn't look like both wallet connect and plugin can be used at the same time
    fcl.pluginRegistry.add([gcpKmsPlugin])
    fcl.config()
        .put("discovery.authn.include", ["0xe5cd26afebe62781", "0x9d2e44203cb13051"])
        .put("app.detail.icon", "https://flow-multisig-git-service-account-onflow.vercel.app/icon.png")
        .put("app.detail.title", "Flow Multisig")
        .put("flow.network", network)
}

const setupWC = async () => {
    console.log('run setup')
    const plugin = await init({
        projectId: process.env.REACT_APP_WALLET_CONNECT,
        includeBaseWC: true,
        name: 'FCL WC DApp',
        metadata: {
            name: 'FCL WC DApp',
            description: 'FCL DApp with support for WalletConnect',
            url: 'https://flow.com/',
            icons: ['https://avatars.githubusercontent.com/u/62387156?s=280&v=4']
        }
    })
    console.log('plugin', plugin?.FclWcServicePlugin)
    return plugin?.FclWcServicePlugin;
}

export const GetPublicKeyAccounts = async (network, publicKey) => {
    let url = `https://key-indexer.staging.flow.com/key/${publicKey}`
    if (network === TESTNET) {
        url = `https://key-indexer.staging.flow.com/key/${publicKey}`
    }
    const result = await fetch(url).then((r) => r.json());
    return result?.accounts || []
}
