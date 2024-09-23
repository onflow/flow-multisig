import axios from 'axios';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req, res) {
  // Get the full URL from the query, including all parameters
  const fullUrl = req.url.split('?url=')[1];

  console.log("Full URL:", fullUrl); // Add this line for debugging

  if (!fullUrl) {
    return res.status(400).json({ error: 'Missing "url" query parameter' });
  }

  try {
    const axiosConfig = {
      method: req.method,
      url: decodeURIComponent(fullUrl),
      headers: {
        ...req.headers,
        'origin': req.headers.origin || '',
      },
      // Remove host and connection headers to avoid conflicts
      ...(delete req.headers.host),
      ...(delete req.headers.connection),
    };

    // If it's a POST request, include the body
    if (req.method === 'POST') {
      axiosConfig.data = req.body;
    }

    console.log("Axios Config:", axiosConfig); // Add this line for debugging

    const response = await axios(axiosConfig);

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    console.log("Response:", response.data); // Add this line for debugging
    res.status(response.status).send(JSON.stringify(response.data));
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Proxy error', message: error.message });
  }
}
