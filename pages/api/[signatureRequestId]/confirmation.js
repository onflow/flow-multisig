
const triggered = {};

export default async function handler({ body, method, query }, res) {
    switch (method) {
        case "GET":
            const result = triggered[query?.signatureRequestId] || false;

            return res.status(200).json({
                triggered: result,
            });

        case "POST":
            triggered[body] = true;

            return res.status(200).json({
                triggered: true
            });

        default:
            return res.status(405);
    }
}
