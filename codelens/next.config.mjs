/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@supabase/supabase-js"],
    // Next 14's client-side Router Cache can serve a stale snapshot of the
    // PREVIOUS page for up to 30s after navigating (a well-known App Router
    // issue — see vercel/next.js issues on stale content after <Link>
    // navigation). Every page in this dashboard fetches its own data client
    // side and is cheap to re-render, so there's no upside to that caching
    // here and it's worth disabling entirely.
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

export default nextConfig;