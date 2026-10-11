import { defineConfig } from 'vite';

// Relativní základ: build funguje v libovolné podsložce (např. https://skola.example/hot-air-sim/).
export default defineConfig({
  base: './',
});
