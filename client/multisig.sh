#!/bin/bash
readonly SERVER=https://flow-multisig-8zw6exh8m-onflow.vercel.app
readonly REQ_FLOW_VER="0.37.0"
menu() {
        echo -e "\n\nChoose Option"
        echo "1. View Unsigned RLP"
        echo "2. Sign"
        echo "3. View Signed RLP"
        echo "4. Send"
        echo "5. Clean Files and Exit"
        echo "6. Exit"
        echo -n "Enter your menu choice [1-6]: "
}

usage() {
        echo ""
        echo "Usage:"
        echo "    ./multisig <identifier> // (required) Signature Request Id of pending transaction"
        echo ""
        exit 0
}

if [ -z $1 ]; then
        usage
fi

function version_lte() { test "$(echo "$2" | tr " " "\n" | sort -V | head -n 1)" == "$1"; }

URL=$SERVER/api/pending/rlp/$1
UNSIGNED_FILE=$1.rlp
SIGNED_FILE=$1-signed.rlp
IS_VALID=$(curl -s -o /dev/null -w "%{http_code}" $URL)
FLOW_VERSION=$(flow version | cut -d" " -f2 | cut -dv -f2)


# require Flow version
echo -e "\nflow version: $FLOW_VERSION"
version_lte $FLOW_VERSION $REQ_FLOW_VER || {
        echo -e "\nError: need flow version $REQ_FLOW_VER or above\n"
        exit 1
}

# save RLP locally
echo -e "\nRetrieving RLP ..."
curl -Ls $URL >$UNSIGNED_FILE
echo -e "Saved RLP locally"

if [ "$IS_VALID" == "200" ]; then

        # creating a menu with the following options
        menu
        while :; do

                # reading choice
                read choice

                case $choice in

                1)
                        echo "Viewing $1"
                        flow transactions decode --include code ./$UNSIGNED_FILE | less
                        ;;
                2)
                        echo "Type in signer and press enter:"
                        read signer

                        echo "Signing with $signer ..."
                        flow transactions sign --network testnet --signer $signer ./$UNSIGNED_FILE --save ./$SIGNED_FILE --filter payload --yes
                        ;;
                3)
                        echo "Viewing $1"
                        if [ -f "$SIGNED_FILE" ]; then
                                flow transactions decode --include code ./$SIGNED_FILE | less
                        else
                                echo -e "\nNeed to sign first\n"
                        fi
                        ;;
                4)
                        echo "Sending Signature"
                        curl -L -H "Content-Type: application/text" -s -d @$SIGNED_FILE $SERVER/api/pending/sig/$1 >/dev/null
                        echo -e "\nSigned RLP sent to server\n"
                        ;;
                5)
                        # remove temp files
                        rm -f ./$SIGNED_FILE
                        rm -f ./$UNSIGNED_FILE
                        echo -e "\n$1"
                        echo -e "files removed\n "
                        exit 0
                        ;;
                6)
                        echo -e "\nDone ...\n"
                        exit
                        ;;

                *)
                        echo "invalid option"
                        menu
                        ;;

                esac
                menu
        done

else
        # page not found error
        echo "Identifier is invalid"
        exit 1
fi

if [ $cmd = "get" ]; then
        curl -L $SERVER/api/pending/rlp/$id >$1.rlp
        echo "Saved RLP to sign-cli.rlp"
else
        if [ -s sign-cli-signed.rlp ]; then
                curl -L -H "Content-Type: application/text" -s -d @sign-cli-signed.rlp $SERVER/api/pending/sig/$id >/dev/null
                echo "Signed RLP sent to server"
        else
                echo "sign-cli-signed.rlp is empty"
                exit 0
        fi
fi
