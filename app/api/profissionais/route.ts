import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // 🌟 Import limpo e direto no topo!

// 📋 1. LISTAR PROFISSIONAIS (Apenas os Ativos)
export async function GET() {
  try {
    const profissionais = await db.profissional.findMany({
      where: {
        ativo: true, // 🌟 FILTRO: Traz apenas profissionais que não foram arquivados
      },
      select: {
        id: true,
        nome: true,
        especialidade: true,
        registro: true,
        observacoes: true,
        email: true, // Necessário para exibir na ficha
        senha: true, // Necessário para exibir na ficha
      },
      orderBy: { nome: "asc" },
    });
    
    return NextResponse.json(profissionais);
  } catch (error) {
    console.error("Erro ao buscar profissionais:", error);
    return NextResponse.json({ message: "Erro ao ler banco de dados." }, { status: 500 });
  }
}

// 💾 2. CADASTRAR NOVO PROFISSIONAL
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const novoProfissional = await db.profissional.create({
      data: {
        nome: body.nome,
        especialidade: body.especialidade,
        registro: body.registro,
        email: body.email,
        senha: body.senha, // Nota: Lembre-se de criptografar essa senha no futuro com bcrypt!
        role: body.role || "profissional",
        observacoes: body.observacoes,
        ativo: true, // Garante que nasce ativo por padrão
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

// 🆙 3. ALTERAR DADOS DO PROFISSIONAL
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

// 🗑️ 4. EXCLUSÃO LÓGICA (DESATIVAR PROFISSIONAL)
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