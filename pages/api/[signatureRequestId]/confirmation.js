
const triggered = {};

export default async function handler({ body, method, query }, res) {
    switch (method) {
        case "GET":

        console.log('query', query)
            const result = triggered[query?.signatureRequestId] || false;

            return res.status(200).json({
                data: { triggered: result },
            });

        case "POST":

            triggered[signatureRequestId] = true;

            return res.status(200).json({
                triggered: true
            });

        default:
            return res.status(405);
    }
}
