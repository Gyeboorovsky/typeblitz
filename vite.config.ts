import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deployed to GitHub Pages as a project site at gyeboorovsky.github.io/typeblitz/,
// so all assets are served under /typeblitz/. Change this if the repo is renamed.
export default defineConfig({
  base: '/typeblitz/',
  plugins: [react()],
});
