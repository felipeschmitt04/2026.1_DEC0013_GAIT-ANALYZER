import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const ADMIN_EMAIL = "admin@teste.com";
const ADMIN_SENHA = "admin123";

export async function POST(request: Request) {
  try {
    //recebe os dados
    const { email, password, loginType } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }
    //tira espaço em branco e deixa tudo minúsculo
    const emailTratado = email.toLowerCase().trim();

    //admin
    if (emailTratado === ADMIN_EMAIL) {
      // Se tentar logar como admin fora da página de admin, exibe erro padrão
      if (loginType !== "admin") {
        return NextResponse.json(
          { message: "E-mail ou senha incorretos." },
          { status: 401 }
        );
      }

      // Valida a senha do administrador
      if (password === ADMIN_SENHA) {
        const response = NextResponse.json({
          success: true,
          role: "admin", 
          nome: "Administrador Geral",
        });

        // Configura o cookie user-role
        response.cookies.set("user-role", "admin", {
          path: "/",
          maxAge: 60 * 60 * 24, // lembra do acesso por um dia
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });

        //limpeza de qualquer profissional anterior
        response.cookies.set("user-id", "", { 
          path: "/",
          maxAge: 0,
        });

        return response;
      } else {
        return NextResponse.json(
          { message: "E-mail ou senha incorretos." },
          { status: 401 }
        );
      }
    }

    //profissional
    // Se um usuário comum tentar usar a rota do Admin, barra direto
    if (loginType === "admin") {
      return NextResponse.json(
        { message: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    // Busca o profissional no banco de dados via Prisma
    const profisional = await db.profissional.findUnique({
      where: { email: emailTratado },
    });

    // Bloqueia se não existir, se a senha estiver errada ou se estiver inativo
    if (!profisional || profisional.senha !== password || !profisional.ativo) {
      return NextResponse.json(
        { message: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      role: profisional.role,
      nome: profisional.nome,
    });
    
    // Configura o cookie user-role
    response.cookies.set("user-role", profisional.role, {
      path: "/",
      maxAge: 60 * 60 * 24,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    // Configura o cookie user-id
    response.cookies.set("user-id", profisional.id, {
      path: "/",
      maxAge: 60 * 60 * 24,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;

  } catch (error) {
    console.error("Erro na API de login:", error);
    return NextResponse.json(
      { message: "Erro interno no servidor de autenticação." },
      { status: 500 }
    );
  }
}