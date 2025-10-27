/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Desabilita o Strict Mode que causa duplas conexões
  reactStrictMode: false,
  
  // Comprimir arquivos estáticos
  compress: true,
  
  // Otimizar produção
  swcMinify: true,
  
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
  
  // Configuração do servidor (para ambiente de produção limitado)
  serverRuntimeConfig: {
    maxServerMemory: 450, // Limita uso de memória do servidor a 450MB
  },
};

export default nextConfig;