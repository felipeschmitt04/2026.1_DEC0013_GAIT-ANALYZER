import { NextRequest, NextResponse } from "next/server";

// URL do backend responsável por gerar o PDF da análise.
const API_BASE_URL = "https://52-247-110-87.sslip.io";

export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { message: "ID da análise não informado." },
        { status: 400 }
      );
    }

    const backendResponse = await fetch(`${API_BASE_URL}/results/${encodeURIComponent(jobId)}/report.pdf`, {
      cache: "no-store",
    });

    if (!backendResponse.ok) {
      let message = "Não foi possível gerar o relatório desta análise.";

      try {
        const errorPayload = await backendResponse.json();
        message = errorPayload.detail || errorPayload.message || message;
      } catch {
        // Se o backend não devolver JSON, mantém a mensagem genérica.
      }

      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const pdfBuffer = await backendResponse.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio_analise_marcha_${jobId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erro ao buscar relatório da análise:", error);
    return NextResponse.json(
      { message: "Erro interno ao baixar o relatório." },
      { status: 500 }
    );
  }
}
