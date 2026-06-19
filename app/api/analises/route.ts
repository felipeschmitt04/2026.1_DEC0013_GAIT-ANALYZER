import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";

// Inicializa o cliente do Supabase com tratamento para NUNCA travar se faltar variável
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ""; 

// 🌟 BLINDADO: Só cria o client se as duas variáveis de fato existirem no seu .env
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function POST(request: Request) {
  try {
    const formData = await request.json(); 
    
    const { nome, pacienteId, videoName } = formData;

    if (!nome || !pacienteId) {
      return NextResponse.json({ message: "Nome e ID do paciente são obrigatórios." }, { status: 400 });
    }

    // 🌟 CORRIGIDO: Gera a string da data de hoje no formato YYYY-MM-DD para bater com o seu Schema
    const hojeStr = new Date().toISOString().split("T")[0];

    // Cria o registro no banco vinculando ao paciente correto
    const novaAnalise = await db.analise.create({
      data: {
        nome,
        data: hojeStr, // 🌟 Passando a string correta que o Prisma espera!
        videoUrl: videoName 
          ? `${supabaseUrl || "https://seubucket.supabase.co"}/storage/v1/object/public/videos/${videoName}` 
          : null,
        
        // Mantendo como strings zeradas exigidas pelo seu Schema
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

// 2. LISTAR ANÁLISES DO BANCO
export async function GET() {
  try {
    const analises = await db.analise.findMany({
      orderBy: { criadoEm: "desc" },
    });
    return NextResponse.json(analises);
  } catch (error: any) {
    console.error("Erro ao listar análises:", error);
    return NextResponse.json({ message: "Erro ao buscar histórico." }, { status: 500 });
  }
}