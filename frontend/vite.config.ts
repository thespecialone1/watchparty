import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    define: {
        // Polyfill for Node.js globals used by some libraries
        global: 'globalThis',
        'process.env': {},
    },
    server: {
        allowedHosts: true,
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/ws': {
                target: 'ws://localhost:8080',
                ws: true,
                changeOrigin: true,
            },
        },
    },
});
