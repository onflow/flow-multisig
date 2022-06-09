const http = require('http');
const fs = require('fs');
const address = process.env.ADDRESS
const keyId = process.env.KEY_ID
const SERVER = "http://localhost:3000/api";
let PendingRequestIds = [];
const DEST_FILENAME = 'to-sign-tx.rlp';
const SIGN_RLP_FILENAME = 'sign-cli-signed.rlp';
const SaveEndpoint = `curl -H "Content-Type: application/text" -d @${SIGN_RLP_FILENAME}  ${SERVER}/pending/sig/`;

const getRequest = (endpoint, options) => {
    return new Promise((resolve, reject) => {
        http.get(endpoint, options, (res) => {
            const { statusCode } = res;
            const contentType = res.headers['content-type'];

            let error;
            // Any 2xx status code signals a successful response but
            // here we're only checking for 200.
            if (statusCode !== 200) {
                error = new Error('Request Failed.\n' +
                    `Status Code: ${statusCode}`);
            } else if (contentType === 'json' && !/^application\/json/.test(contentType)) {
                error = new Error('Invalid content-type.\n' +
                    `Expected application/json but received ${contentType}`);
            }
            if (error) {
                console.error(error.message);
                // Consume response data to free up memory
                res.resume();
                return reject(error.message)
            }

            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                    if (contentType && contentType.indexOf('json') > -1) {
                        const parsedData = JSON.parse(rawData);
                        resolve(parsedData)
                    } else {
                        resolve(rawData);
                    }
                } catch (e) {
                    console.error(e.message);
                }
            });
        }).on('error', (e) => {
            reject(e.message)
        });
    });
}

const initMenu = async () => {
    const endpoint = `${SERVER}/pending/${address}/${keyId}`;
    const result = await getRequest(endpoint, {
        headers: {
            'Content-Type': 'application/json',
        }
    }).catch(e => {
        console.log(e)
    });
    if (!result) {
        return "No Pending Transactions"
    }
    PendingRequestIds = result.data.map(r => r.signatureRequestId);
    let menuText = ''
    PendingRequestIds.forEach((p, i) => {
        menuText = menuText + `${i}. ${p}\n`;
    })
    menuText = menuText + `\n`
    menuText = menuText + `Choose the index: `
    return menuText;
}

const fetcher = async (sigRequestId) => {
    const endpoint = `${SERVER}/pending/rlp/${sigRequestId}`;
    console.log(endpoint)
    const result = await getRequest(endpoint).catch(e => {
        console.log(e)
    });
    if (!result) {
        return "No Pending Transactions"
    }
    return result;
}

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
});

if (!address || !keyId) {
    console.log("Environmental variables are needed");
    console.log("ADDRESS and KEY_ID");
    process.exit(1);
}

initMenu().then(menuText => {
    readline.question(menuText, index => {
        if (isNaN(index)) {
            console.log("value unknown", index)
            process.exit(1)
        }
        const sigRequestId = PendingRequestIds[index]
        console.log(`\nDownloading RLP for ${sigRequestId}  ...\n`);
        fetcher(sigRequestId).then(rlp => {
            fs.writeFileSync(DEST_FILENAME, rlp);
            console.log(`RLP saved to ${DEST_FILENAME}\n`);
            console.log(`Next: Sign RLP to file "${SIGN_RLP_FILENAME}" then use curl to send signature\n`)
            console.log(`${SaveEndpoint}${sigRequestId}\n`)
        });

        readline.close();
    });

});



