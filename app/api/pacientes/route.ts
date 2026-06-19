import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const pacientes = await db.paciente.findMany({
      where: {
        ativo: true, // Traz todos os pacientes que estão ativos
      },
      orderBy: { nome: "asc" },
    });
    
    const pacientesFormatados = pacientes.map((p: any) => ({
      id: p.id,
      nome: p.nome,
      cpf: p.cpf,
      dataNascimento: p.dataNascimento,
      genero: p.genero || "",      
      peso: p.peso || null,         
      altura: p.altura || null,     
      telefone: p.telefone || "",
      observacoes: p.observacoes || "", 
      profissionalId: p.profissionalId
    }));

    return NextResponse.json(pacientesFormatados);
  } catch (error) {
    console.error("Erro ao buscar pacientes:", error);
    return NextResponse.json({ message: "Erro ao buscar pacientes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { nome, dataNascimento, cpf, genero, peso, altura, telefone, observacoes, profissionalId, profissionalId: altId } = await request.json();

    const idEnviado = profissionalId || altId;

    if (!nome || !dataNascimento) {
      return NextResponse.json({ message: "Nome e data de nascimento são obrigatórios." }, { status: 400 });
    }

    let idDoProfissionalFinal = idEnviado;

    // Se o front não enviou nada ou mandou o ID estático de teste, pegamos o primeiro médico do banco
    if (!idDoProfissionalFinal || idDoProfissionalFinal === "id-do-profissional-temporario") {
      const primeiroProfissionalReal = await db.profissional.findFirst();
      
      if (!primeiroProfissionalReal) {
        return NextResponse.json({ 
          message: "Atenção: Cadastre pelo menos um Profissional no sistema antes de criar um Paciente." 
        }, { status: 400 });
      }
      
      idDoProfissionalFinal = primeiroProfissionalReal.id;
    }

    // Se o front não enviar CPF, geramos um fallback para não travar o banco
    const cpfFinal = cpf && cpf.trim() !== "" ? cpf : `000000000${Math.floor(10 + Math.random() * 89)}`;

    const cpfExistente = await db.paciente.findUnique({
      where: { cpf: cpfFinal }
    });

    if (cpfExistente) {
      return NextResponse.json({ message: "Este CPF já está cadastrado em outro prontuário." }, { status: 400 });
    }

    const pesoFormatado = peso ? parseFloat(peso) : null;
    const alturaFormatada = altura ? parseFloat(altura) : null;

    const novoPaciente = await db.paciente.create({
      data: {
        nome,
        dataNascimento, 
        cpf: cpfFinal,              
        profissionalId: idDoProfissionalFinal, // 🌟 Salva com o ID que realmente existe no banco
        ativo: true, 
        genero: genero || null,
        peso: pesoFormatado,
        altura: alturaFormatada,
        telefone: telefone || null, 
        observacoes: observacoes || null,
      },
    });

    return NextResponse.json(novoPaciente);
  } catch (error) {
    console.error("Erro ao cadastrar paciente:", error);
    return NextResponse.json({ message: "Erro ao cadastrar paciente no banco." }, { status: 500 });
  }
}

// alterar paciente
export async function PUT(request: Request) {
  try {
    const { id, nome, dataNascimento, cpf, genero, peso, altura, telefone, observacoes } = await request.json();

    if (!id || !nome || !dataNascimento) {
      return NextResponse.json({ message: "ID, nome e data de nascimento são obrigatórios." }, { status: 400 });
    }

    const pesoFormatado = peso ? parseFloat(peso) : null;
    const alturaFormatada = altura ? parseFloat(altura) : null;

    const pacienteAtualizado = await db.paciente.update({
      where: { id: id },
      data: {
        nome,
        dataNascimento,
        cpf,
        genero: genero || null,
        peso: pesoFormatado,
        altura: alturaFormatada,
        telefone: telefone || null,
        observacoes: observacoes || null,
      },
    });

    return NextResponse.json(pacienteAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar paciente:", error);
    return NextResponse.json({ message: "Erro ao atualizar dados do paciente." }, { status: 500 });
  }
}

// excluir
export async function PATCH(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ message: "O ID do paciente é obrigatório." }, { status: 400 });
    }

    const pacienteDesativado = await db.paciente.update({
      where: { id: id },
      data: { ativo: false },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Paciente arquivado com sucesso.",
      paciente: pacienteDesativado 
    });

  } catch (error) {
    console.error("Erro ao desativar paciente:", error);
    return NextResponse.json({ message: "Erro ao arquivar paciente." }, { status: 500 });
  }
}