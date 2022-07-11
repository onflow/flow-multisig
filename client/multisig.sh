#!/bin/bash
readonly SERVER=https://flow-multisig-git-service-account-onflow.vercel.app
#readonly REQ_FLOW_VER="0.37.0"
config=flow.json
id=$1
while getopts f: flag; do
        case "${flag}" in
        f)
                config=${OPTARG}
                id=$3
                ;;
        esac
done

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
        echo "    ./multisig [-f flow-config] <identifier> // (required) Signature Request Id of pending transaction"
        echo ""
        exit 0
}

if [ -z $id ]; then
        usage
fi

function version_lt() { test "$(echo "$@" | tr " " "\n" | sort -rV | head -n 1)" != "$1"; }

URL=$SERVER/api/pending/rlp/$id
UNSIGNED_FILE=$id.rlp
SIGNED_FILE=$id-signed.rlp
IS_VALID=$(curl -s -o /dev/null -w "%{http_code}" $URL)
FLOW_VERSION=$(flow version | cut -d" " -f2 | cut -dv -f2)

# require Flow version
#echo -e "\nflow version: $FLOW_VERSION"
#if version_lt $FLOW_VERSION $REQ_FLOW_VER; then
#        echo -e "\nError: need flow version $REQ_FLOW_VER or above\n"
#        exit 1
#fi

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
                        echo "Viewing $id"
                        flow transactions decode --include code ./$UNSIGNED_FILE | less
                        ;;
                2)
                        echo "Type in signer and press enter:"
                        read signer

                        echo "Signing with $signer ..."
                        flow transactions sign -f $config --network testnet --signer $signer ./$UNSIGNED_FILE --save ./$SIGNED_FILE --filter payload --yes
                        ;;
                3)
                        echo "Viewing $id"
                        if [ -f "$SIGNED_FILE" ]; then
                                flow transactions decode --include code ./$SIGNED_FILE | less
                        else
                                echo -e "\nNeed to sign first\n"
                        fi
                        ;;
                4)
                        echo "Sending Signature"
                        curl -L -H "Content-Type: application/text" -s -d @$SIGNED_FILE $SERVER/api/pending/sig/$id >/dev/null
                        echo -e "\nSigned RLP sent to server\n"
                        ;;
                5)
                        # remove temp files
                        rm -f ./$SIGNED_FILE
                        rm -f ./$UNSIGNED_FILE
                        echo -e "\n$id"
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
        echo -e "\nIdentifier is invalid\n"
        rm -f ./$UNSIGNED_FILE
        exit 1
fi
