/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Desabilita o Strict Mode que causa duplas conexões
  reactStrictMode: false,
  
  // Comprimir arquivos estáticos
  compress: true,
  
  // Reduzir tamanho do build
  productionBrowserSourceMaps: false,
  
  // Otimizar imagens
  images: {
    unoptimized: true, // Desabilita otimização de imagem no servidor (economiza memória)
  },
  
  // Configurações para economizar memória
  experimental: {
    // Otimizar importações de pacotes
    optimizePackageImports: ['lucide-react'],
  },
  
  // Desabilitar x-powered-by header
  poweredByHeader: false,
};

export default nextConfig;