import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";

// Inicializa o cliente do Supabase 
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ""; 

// o ? : é para caso não ter chave, ficar null e não quebrar
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function POST(request: Request) {
  try {
    // manda o pacote, await pros dados irem certinho
    const formData = await request.json(); 
    // cria o pacote
    const { nome, pacienteId, videoName } = formData;
    // garantia que gente mal intecionada mande coisa
    if (!nome || !pacienteId) {
      return NextResponse.json({ message: "Nome e ID do paciente são obrigatórios." }, { status: 400 });
    }

    // data atual
    const hojeStr = new Date().toISOString().split("T")[0];

    // inserindo nova analise
    const novaAnalise = await db.analise.create({
      data: {
        nome,
        data: hojeStr, 
        videoUrl: videoName 
          ? `${supabaseUrl || "https://seubucket.supabase.co"}/storage/v1/object/public/videos/${videoName}` 
          : null,
        cadencia: "0",      
        comprimento: "0",
        velocidade: "0",
        simetria: "0",
        pacienteId: pacienteId,
      },
    });

    return NextResponse.json({ success: true, id: novaAnalise.id }, { status: 201 });
  } catch (error: any) {
    console.error("Erro detalhado do Prisma ao criar análise:", error);
    return NextResponse.json({ message: "Erro ao registrar análise no banco." }, { status: 500 });
  }
}

//listar analises
export async function GET() {
  try {
    const analises = await db.analise.findMany({// pega multiplas análises
      orderBy: { criadoEm: "desc" },//decrescente, mais recente primeiro
    });
    return NextResponse.json(analises);
  } catch (error: any) {
    console.error("Erro ao listar análises:", error);
    return NextResponse.json({ message: "Erro ao buscar histórico." }, { status: 500 });
  }
}