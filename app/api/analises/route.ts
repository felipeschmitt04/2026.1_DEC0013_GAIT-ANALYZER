import { NextResponse } from "next/server";
import { db } from "@/lib/db";
//url do servidor do back
const API_BASE_URL = "https://52-247-110-87.sslip.io";

// criar nova análise
export async function POST(request: Request) {
  try {
    //ler os arquivos e dados enviados e guarda
    const formData = await request.formData(); 
    
    const file = formData.get("video") as File | null;
    const heightMm = formData.get("height_mm") as string | null;
    const rotated = formData.get("rotated") as string | null;
    const nome = formData.get("nome") as string | null;
    const pacienteId = formData.get("pacienteId") as string | null;

    // vê se não esqueceu nada
    if (!file || !heightMm || !nome || !pacienteId) {
      return NextResponse.json({ message: "Dados obrigatórios ausentes no upload." }, { status: 400 });
    }

    // monta o pacote exatamente como o backend na Azure exige
    const backendFormData = new FormData();
    backendFormData.append("video", file);
    backendFormData.append("height_mm", heightMm);
    backendFormData.append("rotated", rotated || "false");

    // envia o vídeo para o backend
    const azureResponse = await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      body: backendFormData,
    });

    if (!azureResponse.ok) {
      console.error("Erro na resposta da Azure:", azureResponse.statusText);
      return NextResponse.json({ message: "O servidor de processamento (Azure) recusou o vídeo." }, { status: 502 });
    }

    // pega a resposta da Azure contendo o job_id
    const azureData = await azureResponse.json();
    const jobId = azureData.job?.job_id;

    if (!jobId) {
      return NextResponse.json({ message: "Não foi possível resgatar o ID de processamento." }, { status: 500 });
    }

    // Data atual para registrar no banco
    const hojeStr = new Date().toISOString().split("T")[0];

    // salva a análise no banco 
    const novaAnalise = await db.analise.create({
      data: {
        id: jobId, //id do banco igual o da Azure
        nome,
        data: hojeStr, 
        videoUrl: file.name, // apenas para guardar a referência do nome do arquivo original
        cadencia: "0",      
        comprimento: "0",
        velocidade: "0",
        simetria: "0",
        pacienteId: pacienteId,
      },
    });

    // sucesso, manda os dados necesários para o front
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