const createNextIntlPlugin = require("next-intl/plugin")

const withNextIntl = createNextIntlPlugin()

const basePath = process.env.NEXT_PUBLIC_BASE_PATH

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  ...(basePath && basePath !== "" && { basePath }),
  ...(basePath && basePath !== "" && { assetPrefix: basePath }),
  experimental: {
    // Server Actions payload limit
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
}

module.exports = withNextIntl(nextConfig)
