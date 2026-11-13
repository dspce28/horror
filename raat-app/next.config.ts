import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  // the voice route speaks the visitor's name with eSpeak-NG (WebAssembly) on the server: keep it out of the
  // bundle and ship its .wasm with the function
  serverExternalPackages: ['espeak-ng'],
  outputFileTracingIncludes: { '/api/voice': ['./node_modules/espeak-ng/dist/**'] },
};

export default nextConfig;
