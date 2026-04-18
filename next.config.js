/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true'

const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  basePath: isGitHubPages ? '/tw-stock-prediction' : '',
  assetPrefix: isGitHubPages ? '/tw-stock-prediction/' : '',
}

module.exports = nextConfig
