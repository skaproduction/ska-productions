import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // pin the project root (a stray package-lock.json in the user folder confuses the guess)
  turbopack: { root: __dirname },
  // Uploaded posters and photos are served from Vercel Blob in production.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com', pathname: '/ska/media/**' }],
  },
  // Lets phones on the same Wi-Fi open the dev server at http://<this PC's IP>:3000.
  allowedDevOrigins: ['172.30.1.42', '172.30.1.59'],
};

export default nextConfig;
