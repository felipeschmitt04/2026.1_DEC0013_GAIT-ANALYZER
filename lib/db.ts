// consulta banco de dados
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
// verifica se ja em uma conexão, se tiver reaproveita, é pra quando alterar algo no código não criar uma nova conexão
export const db = globalForPrisma.prisma || new PrismaClient();
// salva a conexão na variável global
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;