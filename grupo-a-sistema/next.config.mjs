/** @type {import('next').NextConfig} */
const nextConfig = {
  // O Prisma Client é CommonJS e carrega um engine nativo — deixar o bundler do
  // servidor empacotá-lo quebra a resolução em runtime.
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
}

export default nextConfig
