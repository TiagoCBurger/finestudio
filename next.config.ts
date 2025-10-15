import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Supabase storage, production
      {
        protocol: 'https',
        hostname: 'zszbbhofscgnnkvyonow.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'scqpyqlghrjvftvoyhau.supabase.co',
      },

      // Supabase storage, development
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },

      // Fal.ai temporary URLs (fallback se upload falhar)
      {
        protocol: 'https',
        hostname: 'v3b.fal.media',
      },
      {
        protocol: 'https',
        hostname: 'fal.media',
      },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },

  serverExternalPackages: ['postgres'],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only packages in client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        perf_hooks: false,
      };

      // Exclude server-only modules from client bundle
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/lib/database': false,
        '@/lib/supabase/server': false,
        '@/lib/auth': false,
      };
    }
    return config;
  },

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,

  // biome-ignore lint/suspicious/useAwait: "rewrites is async"
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://us.i.posthog.com/decide',
      },
    ];
  },
};

export default nextConfig;
