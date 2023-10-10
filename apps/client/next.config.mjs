import withPWAInit from "@ducanh2912/next-pwa";

/**
 * @template {import('next').NextConfig} T
 * @param {T} config - A generic parameter that flows through to the return type
 * @constraint {{import('next').NextConfig}}
 */
async function defineNextConfig(config) {
  const plugins = [];

  const withPWA = withPWAInit({
    dest: "public",
    disable: process.env.NODE_ENV === "development",
  });
  plugins.push(withPWA);

  return plugins.reduce((acc, plugin) => plugin(acc), config);
}

export default defineNextConfig({
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ["pub-d165b348e0754b599a9a2ce9b759e149.r2.dev"],
  },
});
