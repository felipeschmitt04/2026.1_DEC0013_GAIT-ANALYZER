import type { NextConfig } from "next";
// manda a raiz para o login
const nextConfig: NextConfig = {
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