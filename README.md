This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm i
npm run dev
# or
yarn
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

## Signing Pending transaction via CLI
After the transaction has been generated via webpage a `signature request id` is generated, this id is used to retrieve the transaction RLP, which is used for signing with flow cli. "localhost" is used only for examples. This service is hosted in vercel.

### curl to get RLP
 - `curl -l http://localhost:3000/api/pending/rlp/b6d2aab4160c5ce2d26d752d4a312922970863e2ba324a2d8d31a6ce4b61661e > sign-cli.rlp`
 - save the RLP to a local file for signing, in this example `sign-cli.rlp` is used

Sign the RLP using flow cli and save the output signature RLP to `sign-cli-signed.rlp`
 - `flow transactions sign ./sign-cli.rlp --signer ####### --filter payload --yes --save ./sign-cli-signed.rlp`

Send the signed RLP raw text to the server
 - `curl -H "Content-Type: application/text" -d @sign-cli-signed.rlp  http://localhost:3000/api/pending/sig/b6d2aab4160c5ce2d26d752d4a312922970863e2ba324a2d8d31a6ce4b61661e`

### flow cli to get RLP
 - `flow transactions sign --from-remote-url http://localhost:3000/api/pending/rlp/b6d2aab4160c5ce2d26d752d4a312922970863e2ba324a2d8d31a6ce4b61661e --signer <account>`
 - account in this example is an entry in flow.json file


## Query parameters to webapp
 - "type" is of value "foundation" or "service"
    - "foundation" will pull scripts from foundation github
    - "service" will pull scripts from service-account github
- "name" is the name of the script to load, ie. "hello.cdc"
- "param" is the json parameters to pass into the cadence script
- "acct" is the multiple signature account

Example:
`http://localhost:3000/testnet?type=foundation&name=hello.cdc&param=[]&acct=0xc590d541b72f0ac1`

## Multisig Bash Script Helper
location of helper script [multisig.sh](./client/multisig.sh)
            
    Usage:
    -c: (required) 'get' to retreive RLP or 'post' to send signed RLP to server
    -i: (required) Signature Request Id of pending transaction
 - Command (-c)
    - **get** makes a GET request to get pending transaction RLP
    - **post** makes a POST request to post signed RLP
- Identifier (-i)
    - **Signature Request Id** is the hash identifier of the pending transaction that needs to be signed

### Example using shell script
 - `./multisig.sh -c get -i b6d2aab4160c5ce2d26d752d4a312922970863e2ba324a2d8d31a6ce4b61661e`

 - `flow transactions sign ./sign-cli.rlp --signer ####### --filter payload --yes --save ./sign-cli-signed.rlp`
 
 - `./multisig.sh -c post -i b6d2aab4160c5ce2d26d752d4a312922970863e2ba324a2d8d31a6ce4b61661e`


## Learn More about Next.js

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Set up flow
Install/setup Flow CLI
`brew install flow-cli`
https://docs.onflow.org/flow-cli/install/

Get Service Account information
`flow init`
`flow keys generate`


### Create Account and fund
https://testnet-faucet.onflow.org/
Add public key from `flow keys generate` command
 

