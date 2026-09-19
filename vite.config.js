import { defineConfig } from 'vite';

/**
 * 本地开发服务器：npm run dev  →  http://127.0.0.1:8123/
 * base: './' 与 Capacitor 线上资源的相对路径保持一致。
 * 打包 / Android 仍走 scripts/build-web.mjs（esbuild）输出到 dist/。
 */
export default defineConfig({
  base: './',
  server: {
    port: 8123,
    strictPort: true,
    host: true, // 同时监听局域网，方便手机真机调试
  },
  preview: {
    port: 8123,
    strictPort: true,
  },
});
