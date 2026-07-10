import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// 🌟 COLOQUE AQUI A URL QUE SEU AMIGO PASSOU DA AZURE
const API_BASE_URL = "https://52-247-110-87.sslip.io";

export async function POST(request: Request) {
  try {
    // 1. Como recebemos um arquivo, usamos request.formData() em vez de request.json()
    const formData = await request.formData(); 
    
    const file = formData.get("video") as File | null;
    const heightMm = formData.get("height_mm") as string | null;
    const rotated = formData.get("rotated") as string | null;
    const nome = formData.get("nome") as string | null;
    const pacienteId = formData.get("pacienteId") as string | null;

    // Validação de segurança básica
    if (!file || !heightMm || !nome || !pacienteId) {
      return NextResponse.json({ message: "Dados obrigatórios ausentes no upload." }, { status: 400 });
    }

    // 2. Montamos o pacote exatamente como o backend na Azure exige
    const backendFormData = new FormData();
    backendFormData.append("video", file);
    backendFormData.append("height_mm", heightMm);
    backendFormData.append("rotated", rotated || "false");

    // 3. Disparamos o vídeo para a Azure começar o processamento pesado
    const azureResponse = await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      body: backendFormData,
    });

    if (!azureResponse.ok) {
      console.error("Erro na resposta da Azure:", azureResponse.statusText);
      return NextResponse.json({ message: "O servidor de processamento (Azure) recusou o vídeo." }, { status: 502 });
    }

    // Pegamos a resposta da Azure contendo o job_id
    const azureData = await azureResponse.json();
    const jobId = azureData.job?.job_id;

    if (!jobId) {
      return NextResponse.json({ message: "Não foi possível resgatar o ID de processamento." }, { status: 500 });
    }

    // 4. Data atual para registrar no histórico do Supabase
    const hojeStr = new Date().toISOString().split("T")[0];

    // 5. Inserimos a nova análise no Prisma/Supabase usando o ID gerado pelo backend
    const novaAnalise = await db.analise.create({
      data: {
        id: jobId, // Importante: amarramos o ID do histórico local com o id do job da Azure!
        nome,
        data: hojeStr, 
        videoUrl: file.name, // Apenas para guardar a referência do nome do arquivo original
        cadencia: "0",      
        comprimento: "0",
        velocidade: "0",
        simetria: "0",
        pacienteId: pacienteId,
      },
    });

    // Devolvemos o job_id para o frontend poder redirecionar para a tela de visualização
    return NextResponse.json({ success: true, job_id: novaAnalise.id }, { status: 201 });

  } catch (error: any) {
    console.error("Erro detalhado ao criar análise na API:", error);
    return NextResponse.json({ message: "Erro interno ao processar e salvar a análise." }, { status: 500 });
  }
}

// Listar todas as análises ordenadas
export async function GET() {
  try {
    const analises = await db.analise.findMany({
      orderBy: { criadoEm: "desc" }, // Decrescente, mais recente primeiro
    });
    return NextResponse.json(analises);
  } catch (error: any) {
    console.error("Erro ao listar análises:", error);
    return NextResponse.json({ message: "Erro ao buscar histórico." }, { status: 500 });
  }
}