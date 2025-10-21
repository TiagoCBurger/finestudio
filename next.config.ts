import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    // Cache settings for external storage (R2, Supabase)
    minimumCacheTTL: 60, // Cache optimized images for 60 seconds
    // Responsive image sizes for different devices
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Enable optimization with extended timeout for AI-generated content
    unoptimized: false,
    // Increase timeout for external image fetching (R2 signed URLs)
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days to match R2 signed URL expiration
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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

      // Cloudflare R2 storage - signed URLs with path-style (works without public access)
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      // Cloudflare R2 storage - public endpoint (if enabled)
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      // Custom R2 domain (if R2_PUBLIC_URL is configured)
      // Add your custom domain here if using a CNAME for R2
      // Example: { protocol: 'https', hostname: 'cdn.yourdomain.com' },
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
