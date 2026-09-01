/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" empacota só o necessário para rodar em produção (usado pelo
  // Dockerfile multi-stage) — sem isso a imagem de produção levaria todo o
  // node_modules de desenvolvimento junto.
  output: "standalone",
  experimental: {
    // Server Actions já são estáveis no Next 14, mantido explícito por clareza.
    serverActions: true,
  },
};

export default nextConfig;
