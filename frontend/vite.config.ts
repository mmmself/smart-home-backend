import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const certDir = path.resolve(__dirname, 'certs');
  const httpsConfig = fs.existsSync(path.join(certDir, 'cert.pem')) &&
    fs.existsSync(path.join(certDir, 'key.pem'))
    ? {
        https: {
          cert: fs.readFileSync(path.join(certDir, 'cert.pem')),
          key: fs.readFileSync(path.join(certDir, 'key.pem')),
        },
      }
    : {};

  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      ...httpsConfig,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
