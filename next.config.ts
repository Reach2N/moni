import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // CLAUDE.md is hand maintained and holds the project conventions, so Next must
  // not regenerate it on every dev boot.
  agentRules: false,
  turbopack: {
    root: process.cwd(),
  },
}

export default nextConfig
