import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Games are separate packages, and must share the app's React and i18n instances.
  resolve: { dedupe: ["react", "react-dom", "i18next", "react-i18next"] },
  server: {
    proxy: { "/rooms": { target: "http://localhost:8787", ws: true } },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        navigateFallbackDenylist: [/^\/rooms/],
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest,m4a}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts",
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: "PlayHub",
        short_name: "PlayHub",
        lang: "th",
        display: "standalone",
        background_color: "#0B1A2B",
        theme_color: "#0B1A2B",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
});
