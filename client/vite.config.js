import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const apiProxy = {
  target: "http://localhost:5000",
  configure(proxy) {
    proxy.on("proxyReq", (proxyRequest, request) => {
      proxyRequest.setHeader("x-forwarded-host", request.headers.host);
      proxyRequest.setHeader("x-forwarded-proto", request.headers["x-forwarded-proto"] || "http");
    });
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": apiProxy,
      "/robots.txt": apiProxy,
      "/sitemap.xml": apiProxy,
    },
  },
});
