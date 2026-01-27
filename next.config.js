/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/fpl-api/:path*',
        destination: 'https://fantasy.premierleague.com/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
