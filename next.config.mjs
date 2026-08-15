/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // No framing headers are set intentionally. Rise Vision's Web Page component
  // only allows embedding when there is NO restrictive X-Frame-Options AND no
  // Content-Security-Policy `frame-ancestors` directive that excludes its
  // domain. Its checker does not treat `frame-ancestors *` as "allow all", so
  // sending that directive actually blocks the embed. With no framing headers
  // at all, browsers impose no restriction and any parent (including hardware
  // player origins like chrome-app/file://) can embed the public display.
}

export default nextConfig
