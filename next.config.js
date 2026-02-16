/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['three'],
    serverExternalPackages: ['better-sqlite3'],
    output: 'standalone',
};

module.exports = nextConfig;
