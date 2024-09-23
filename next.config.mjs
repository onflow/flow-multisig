/**
 * @type {import('next').NextConfig}
 */
 const nextConfig = {
  reactStrictMode: true,
  sassOptions: {
    includePaths: ['./styles'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "upgrade-insecure-requests; default-src https: http: 'unsafe-inline' 'unsafe-eval'; connect-src https: http: 'unsafe-inline';"
          },
        ],
      },
    ];
  },
}

export default nextConfig