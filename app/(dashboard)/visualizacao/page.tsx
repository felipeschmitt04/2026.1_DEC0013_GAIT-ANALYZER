"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Suspense } from "react";

interface SegmentoCorporal {
  id: string;
  titulo: string;
  descricao: string;
}
// Lista dos segmentos 
const segmentos: SegmentoCorporal[] = [
  {
    id: "perna-direita",
    titulo: "Perna Direita",
    descricao: "Análise cinemática do joelho, tornozelo, quadril e ciclo de pisada do lado direito.",
  },
  {
    id: "perna-esquerda",
    titulo: "Perna Esquerda",
    descricao: "Análise cinemática do joelho, tornozelo, quadril e ciclo de pisada do lado esquerdo.",
  },
  {
    id: "tronco-coluna",
    titulo: "Tronco & Coluna",
    descricao: "Avaliação de postura, inclinação sagital, oscilação lateral e estabilidade central.",
  },
];

// seleção do foco da análise
function FocoAnaliseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Resgata o jobId vindo da tela de upload ou do histórico de relatórios
  const jobId = searchParams.get("jobId") || "";

  const handleSelecionar = (segmentoId: string) => {
    // Redireciona repassando o segmento focado 
    router.push(`/visualizacao/3d?jobId=${jobId}&segmento=${segmentoId}`);
  };

  return (
    // Container principal da página
    <div style={{ padding: "24px" }}>
      {/* cabeçalho */}
      <h2 style={{ fontSize: "30px", fontWeight: "bold", color: "#0f172a", margin: 0, lineHeight: "1.2" }}>
        Foco da Análise
      </h2>
      <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px", marginBottom: "32px" }}>
        Selecione qual segmento corporal deseja visualizar no modelo 3D e gráficos.
      </p>
      {/* Grade contendo os segmentos corporais disponíveis */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "20px",
        }}
      > {/* cartão para cada segmento corporal */}
        {segmentos.map((segmento) => (
          // cartão contendo informações do segmento
          <Card
            key={segmento.id}
            className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          > {/* Cabeçalho do cartão */}
            <CardHeader className="pb-2">
              {/* Ícone */}
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-2">
                <Activity size={20} className="text-emerald-600" />
              </div>
              {/* Nome do segmento corporal selecionado */}
              <h3 className="text-base font-bold text-slate-900 m-0">{segmento.titulo}</h3>
            </CardHeader>
            {/* Conteúdo do cartão com descrição e ação */}
            <CardContent className="grid gap-4">
              {/* Descrição explicando o que será analisado naquele segmento */}
              <p className="text-sm text-slate-500 m-0">{segmento.descricao}</p>
               {/* Botão enviar */}
              <Button
                onClick={() => handleSelecionar(segmento.id)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold h-11 rounded-xl flex items-center justify-center gap-2"
              >
                Selecionar <ArrowRight size={16} />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Exportação padrão envolvendo a página com Suspense
export default function FocoAnalisePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500">Carregando opções...</div>}>
      <FocoAnaliseContent />
    </Suspense>
  );
}