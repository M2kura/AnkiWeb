import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss()
	],
	base: '/AnkiWeb/',
	server: {
		hmr: {
			protocol: 'ws',
			host: 'localhost',
			port: 5173
		}
	},
	build: {
		outDir: 'dist',
		// Generate source maps for easier debugging
		sourcemap: true,
		// Ensure proper asset handling for GitHub Pages
		assetsDir: 'assets',
		rollupOptions: {
			output: {
				manualChunks: undefined
			}
		}
	},
	// Ensure proper handling of static assets
	publicDir: 'public'
})
