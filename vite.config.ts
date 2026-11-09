import { defineConfig } from 'vite';
import RubyPlugin from 'vite-plugin-ruby';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({ plugins: [RubyPlugin(), react(), tailwind()], resolve: { alias: { '@': fileURLToPath(new URL('./app/javascript', import.meta.url)) } } });
