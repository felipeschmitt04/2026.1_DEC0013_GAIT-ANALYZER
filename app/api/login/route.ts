import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const ADMIN_EMAIL = "admin@teste.com";// admin é fixo
const ADMIN_SENHA = "admin123";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {// analisa se tem email e senha, 
      return NextResponse.json(
        { message: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const emailTratado = email.toLowerCase().trim();// torna minúsculo e tira espaços
    // testa email e senha
    if (emailTratado === ADMIN_EMAIL) {
      if (password === ADMIN_SENHA) {
        const response = NextResponse.json({
          success: true,
          role: "admin", 
          nome: "Administrador Geral",
        });

        response.cookies.set("user-role", "admin", {//cria cookie user-role com valor admin
          path: "/",// pra todo o site
          maxAge: 60 * 60 * 24, // dura 1 dia, aí pode entrar sem logar de novo
          httpOnly: false,//libera o acesso ao cookie
          secure: process.env.NODE_ENV === "production",// se tiver na internet/servidor ,vira production e só envia o cookie se for https
          sameSite: "lax",// protege o cookie de ataques, verifica daonde veio o clique se não veio de terceiros(outro site aberto em outra guia por exemplo)
        });

        response.cookies.set("user-id", "", {// apaga o cookie user-id que poderia ter de um profissional
          path: "/",//admin não tem id
          maxAge: 0,
        });

        return response;// entra como admin
      } else {
        return NextResponse.json(
          { message: "Senha administrativa incorreta." },
          { status: 401 }
        );
      }
    }

    const profissional = await db.profissional.findUnique({// prisma procurando no banco de dados o email
      where: { email: emailTratado },
    });

    //  Bloqueia se o profissional não existir, se a senha estiver errada ou se estiver inativo
    if (!profissional || profissional.senha !== password || !profissional.ativo) {
      return NextResponse.json(
        { message: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({// manda o cargo e o nome do profissional
      success: true,
      role: profissional.role,
      nome: profissional.nome,
    });
    //mesma coisa do cookie do admin, mas com o cargo do profissional
    response.cookies.set("user-role", profissional.role, {
      path: "/",
      maxAge: 60 * 60 * 24,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    // cria o cookie de id
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