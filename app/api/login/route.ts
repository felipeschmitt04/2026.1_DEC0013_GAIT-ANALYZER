import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const ADMIN_EMAIL = "admin@teste.com";
const ADMIN_SENHA = "admin123";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const emailTratado = email.toLowerCase().trim();

    if (emailTratado === ADMIN_EMAIL) {
      if (password === ADMIN_SENHA) {
        const response = NextResponse.json({
          success: true,
          role: "admin",
          nome: "Administrador Geral",
        });

        response.cookies.set("user-role", "admin", {
          path: "/",
          maxAge: 60 * 60 * 24, // 1 dia
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });

        response.cookies.set("user-id", "", {
          path: "/",
          maxAge: 0,
        });

        return response;
      } else {
        return NextResponse.json(
          { message: "Senha administrativa incorreta." },
          { status: 401 }
        );
      }
    }

    const profissional = await db.profissional.findUnique({
      where: { email: emailTratado },
    });

    //  Bloqueia se o profissional não existir, se a senha estiver errada OU se estiver inativo
    if (!profissional || profissional.senha !== password || !profissional.ativo) {
      return NextResponse.json(
        { message: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      role: profissional.role,
      nome: profissional.nome,
    });

    response.cookies.set("user-role", profissional.role, {
      path: "/",
      maxAge: 60 * 60 * 24,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    // É assim que a tela de Configurações vai saber QUAL profissional buscar na API.
    response.cookies.set("user-id", profissional.id, {
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