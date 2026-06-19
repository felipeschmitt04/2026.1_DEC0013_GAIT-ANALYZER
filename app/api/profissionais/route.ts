import { NextResponse } from "next/server";
import { db } from "@/lib/db"; 


export async function GET() {
  try {
    const profissionais = await db.profissional.findMany({
      where: {
        ativo: true, 
      },
      select: {
        id: true,
        nome: true,
        especialidade: true,
        registro: true,
        observacoes: true,
        email: true, 
        senha: true, 
      },
      orderBy: { nome: "asc" },
    });
    
    return NextResponse.json(profissionais);
  } catch (error) {
    console.error("Erro ao buscar profissionais:", error);
    return NextResponse.json({ message: "Erro ao ler banco de dados." }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const body = await request.json();

    const novoProfissional = await db.profissional.create({
      data: {
        nome: body.nome,
        especialidade: body.especialidade,
        registro: body.registro,
        email: body.email,
        senha: body.senha,
        role: body.role || "profissional",
        observacoes: body.observacoes,
        ativo: true, 
      },
    });

    return NextResponse.json(novoProfissional, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar profissional:", error);
    return NextResponse.json(
      { message: "Não foi possível salvar o profissional. Verifique se o registro ou e-mail já existe." },
      { status: 500 }
    );
  }
}

// alterar
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, nome, especialidade, registro, email, senha, observacoes } = body;

    if (!id) {
      return NextResponse.json({ message: "O ID do profissional é obrigatório." }, { status: 400 });
    }

    const profissionalAtualizado = await db.profissional.update({
      where: { id: id },
      data: {
        nome,
        especialidade,
        registro,
        email,
        senha,
        observacoes,
      },
    });

    return NextResponse.json(profissionalAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar profissional:", error);
    return NextResponse.json(
      { message: "Erro ao atualizar dados. Verifique se o e-mail ou registro já pertencem a outro usuário." },
      { status: 500 }
    );
  }
}

// excluir
export async function PATCH(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ message: "O ID do profissional é obrigatório." }, { status: 400 });
    }

    // Altera o status para inativo, bloqueando logins futuros e ocultando da listagem
    const profissionalDesativado = await db.profissional.update({
      where: { id: id },
      data: { ativo: false },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Acesso do profissional revogado com sucesso.",
      profissional: profissionalDesativado
    });
  } catch (error) {
    console.error("Erro ao desativar profissional:", error);
    return NextResponse.json({ message: "Erro ao arquivar profissional." }, { status: 500 });
  }
}