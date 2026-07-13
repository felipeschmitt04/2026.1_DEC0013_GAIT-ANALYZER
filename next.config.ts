import type { NextConfig } from "next";
// manda a raiz para o login, geralmente quando inicia o código
const nextConfig: NextConfig = {
  output: 'standalone',// otimiza o tamanho do projeto
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: true, // deixa fixo no servidor
      },
    ];
  },
};

export default nextConfig;