#!/bin/bash
readonly SERVER=https://flow-multisig-f1xws1u1j-onflow.vercel.app/
while getopts c:i: flag; do
        case "${flag}" in
        c) cmd=${OPTARG} ;;
        i) id=${OPTARG} ;;
        esac
done

usage() {
        echo ""
        echo "Usage:"
        echo "    -c: (required) 'get' to retreive RLP or 'post' to send signed RLP to server"
        echo "    -i: (required) Signature Request Id of pending transaction"
        echo ""
        exit 0
}

if [ -z $cmd ]; then
        usage
fi

if [ -z $id ]; then
        usage
fi

if [ $cmd = "get" ]; then
        curl -L $SERVER/api/pending/rlp/$id >sign-cli.rlp
        echo "Saved RLP to sign-cli.rlp"
else
        if [ -s sign-cli-signed.rlp ]; then
                curl -L -H "Content-Type: application/text" -s -d @sign-cli-signed.rlp $SERVER/api/pending/sig/$id > /dev/null
                echo "Signed RLP sent to server"
        else
                echo "sign-cli-signed.rlp is empty"
                exit 0
        fi
fi
