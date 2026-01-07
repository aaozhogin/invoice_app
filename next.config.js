/**
 * Next.js configuration
 *
 * Supports optional basePath via env var `NEXT_PUBLIC_BASE_PATH`.
 * Example: set to "/NDISapp" for hosting under www.onmanylevels.com/NDISapp
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

module.exports = {
  reactStrictMode: true,
  basePath,
}