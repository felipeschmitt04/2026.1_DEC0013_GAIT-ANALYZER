import { NextResponse } from "next/server";
import { db } from "@/lib/db"; 

//listar
export async function GET() {
  try {
    const profissionais = await db.profissional.findMany({
      //apenas os ativos
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
      orderBy: { nome: "asc" },//alfabético
    });
    
    return NextResponse.json(profissionais);
  } catch (error) {
    console.error("Erro ao buscar profissionais:", error);
    return NextResponse.json({ message: "Erro ao ler banco de dados." }, { status: 500 });
  }
}

//cadastrar
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, especialidade, registro, email, senha, role, observacoes } = body;

    if (!email || !registro || !nome) {
      return NextResponse.json({ message: "Nome, e-mail e registro são obrigatórios." }, { status: 400 });
    }

    const emailTratado = email.toLowerCase().trim();

    // verifica se já existe esse email
    const emailExistente = await db.profissional.findUnique({
      where: { email: emailTratado }
    });

    if (emailExistente) {
      return NextResponse.json({ message: "Este e-mail já está cadastrado em outra conta." }, { status: 400 });
    }

    // verifica se já existe esse registro
    const registroExistente = await db.profissional.findUnique({
      where: { registro: registro.trim() }
    });

    if (registroExistente) {
      return NextResponse.json({ message: "Este registro profissional já está cadastrado no sistema." }, { status: 400 });
    }

    // cria o profissional
    const novoProfissional = await db.profissional.create({
      data: {
        nome,
        especialidade,
        registro: registro.trim(),
        email: emailTratado,
        senha,
        role: role || "profissional",
        observacoes,
        ativo: true, 
      },
    });

    return NextResponse.json(novoProfissional, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar profissional:", error);
    return NextResponse.json({ message: "Erro interno ao salvar o profissional." }, { status: 500 });
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

    const emailTratado = email.toLowerCase().trim();

    // verifica se já existe esse email 
    const emailExistente = await db.profissional.findFirst({
      where: { 
        email: emailTratado,
        NOT: { id: id } //verifica todos exceto o profissional alterado
      }
    });

    if (emailExistente) {
      return NextResponse.json({ message: "Este e-mail já está sendo usado por outro profissional." }, { status: 400 });
    }

    // verifica se já existe esse registro
    const registroExistente = await db.profissional.findFirst({
      where: { 
        registro: registro.trim(),
        NOT: { id: id } //verifica todos exceto o profissional alterado
      }
    });

    if (registroExistente) {
      return NextResponse.json({ message: "Este registro profissional já pertence a outro usuário." }, { status: 400 });
    }

    //atualiza
    const profissionalAtualizado = await db.profissional.update({
      where: { id: id },
      data: {
        nome,
        especialidade,
        registro: registro.trim(),
        email: emailTratado,
        senha,
        observacoes,
      },
    });

    return NextResponse.json(profissionalAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar profissional:", error);
    return NextResponse.json({ message: "Erro interno ao atualizar dados." }, { status: 500 });
  }
}

// excluir
export async function PATCH(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ message: "O ID do profissional é obrigatório." }, { status: 400 });
    }

    // Altera o status para inativo
    const profissionalDesativado = await db.profissional.update({
      where: { id: id },
      data: { ativo: false },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Profissional excluído com sucesso.",
      profissional: profissionalDesativado
    });
  } catch (error) {
    console.error("Erro ao excluir profissional:", error);
    return NextResponse.json({ message: "Erro ao excluir profissional." }, { status: 500 });
  }
}