/// <reference types="vitest" />
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config'; // Import the main Vite config

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts', // or vitest.setup.ts
      css: true, // if you want to test components with CSS Modules or other CSS
    },
  })
);
