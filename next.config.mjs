/**
 * @type {import('next').NextConfig}
 */
 const nextConfig = {
  reactStrictMode: true,
  sassOptions: {
    includePaths: ['./styles'],
  },
  // Add this configuration to increase the payload size limit
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default nextConfig