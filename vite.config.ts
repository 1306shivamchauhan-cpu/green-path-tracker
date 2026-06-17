import { defineConfig } from 'vite';

// A custom plugin to simulate the Edge security headers locally
function edgeSecurityHeadersPlugin() {
  return {
    name: 'edge-security-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Manually applying the headers defined in start.ts for local dev simulation
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://gateway.lovable.dev;");
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [edgeSecurityHeadersPlugin()],
  build: {
    outDir: 'dist',
    target: 'esnext'
  }
});
