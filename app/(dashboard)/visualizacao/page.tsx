"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface SegmentoCorporal {
  id: string;
  titulo: string;
  descricao: string;
}

const segmentos: SegmentoCorporal[] = [
  {
    id: "membro-inferior",
    titulo: "Membro Inferior",
    descricao: "Análise de marcha, joelho, tornozelo e pisada.",
  },
  {
    id: "membro-superior",
    titulo: "Membro Superior",
    descricao: "Cinemática de ombro, cotovelo e alcance.",
  },
  {
    id: "tronco-coluna",
    titulo: "Tronco & Coluna",
    descricao: "Postura, inclinação sagital e estabilidade central.",
  },
];

export default function FocoAnalisePage() {
  const router = useRouter();

  const handleSelecionar = (segmentoId: string) => {
    router.push(`/visualizacao/3d?segmento=${segmentoId}`);
  };

  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{ fontSize: "30px", fontWeight: "bold", color: "#0f172a", margin: 0, lineHeight: "1.2" }}>
        Foco da Análise
      </h2>
      <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px", marginBottom: "32px" }}>
        Selecione qual segmento corporal deseja visualizar no modelo 3D e gráficos.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "20px",
        }}
      >
        {segmentos.map((segmento) => (
          <Card
            key={segmento.id}
            className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-2">
                <Activity size={20} className="text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900 m-0">{segmento.titulo}</h3>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-sm text-slate-500 m-0">{segmento.descricao}</p>
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