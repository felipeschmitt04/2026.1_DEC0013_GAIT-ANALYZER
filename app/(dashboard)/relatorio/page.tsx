"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtecaoPaciente } from "@/components/ProtecaoPaciente";
import { usePaciente } from "@/app/PacienteContext";
import { FileText, Calendar, ChevronRight, FileDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Interface para as análises (futuramente virá do seu banco/API)
interface Analise {
  id: number;
  nome: string;
  data: string;
}

export default function RelatoriosPage() {
  const { pacienteAtivo, setAnaliseAtiva } = usePaciente();
  const router = useRouter();

  // Exemplo de dados (Simulando análises salvas do paciente atual)
  const [analises] = useState<Analise[]>([
    { id: 1, nome: "Caminhada Pós-Cirúrgica 01", data: "2026-05-01" },
    { id: 2, nome: "Teste de Esforço Esteira", data: "2026-04-15" },
    { id: 3, nome: "Avaliação de Marcha Inicial", data: "2026-03-20" },
  ]);

  const [selecionadaLocal, setSelecionadaLocal] = useState<Analise | null>(null);

  const handleVerNoMapa3D = () => {
    if (!selecionadaLocal) return;
    setAnaliseAtiva(selecionadaLocal.nome);
    router.push("/visualizacao");
  };

  const handleGerarPDF = () => {
    if (!selecionadaLocal) return;
    alert(`Gerando relatório em PDF para: ${selecionadaLocal.nome}`);
    // Aqui entraria sua biblioteca de PDF (jspdf ou similar)
  };

  return (
    <ProtecaoPaciente>
      <div className="h-full flex flex-col p-10 max-w-6xl mx-auto w-full">
        
        {/* CABEÇALHO */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Relatórios</h1>
          <p className="text-slate-500">
            Escolha qual análise de <span className="font-bold text-emerald-600">{pacienteAtivo}</span> deseja visualizar ou exportar.
          </p>
        </div>

        {/* LISTA DE ANÁLISES (BLOCOS) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start overflow-y-auto pr-2">
          {analises.map((analise) => (
            <div
              key={analise.id}
              onClick={() => setSelecionadaLocal(analise)}
              className={cn(
                "group relative p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-4",
                selecionadaLocal?.id === analise.id
                  ? "border-emerald-500 bg-emerald-50/30 shadow-md"
                  : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
              )}
            >
              <div className="flex items-start justify-between">
                <div className={cn(
                  "p-3 rounded-xl transition-colors",
                  selecionadaLocal?.id === analise.id ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                )}>
                  <FileText size={24} />
                </div>
                {selecionadaLocal?.id === analise.id && (
                  <CheckCircle2 size={20} className="text-emerald-500 animate-in zoom-in" />
                )}
              </div>

              <div>
                <h3 className="font-bold text-slate-800 leading-tight mb-1">{analise.nome}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                  <Calendar size={12} />
                  {new Date(analise.data).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* BARRA DE AÇÕES (RODAPÉ) */}
        <div className={cn(
          "mt-8 p-4 bg-slate-900 rounded-3xl flex items-center justify-between transition-all transform",
          selecionadaLocal ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"
        )}>
          <div className="pl-4">
            <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Selecionado:</p>
            <p className="text-white font-medium">{selecionadaLocal?.nome}</p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleGerarPDF}
              variant="outline"
              className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white rounded-2xl h-12 px-6 gap-2"
            >
              <FileDown size={18} /> Emitir em PDF
            </Button>

            <Button
              onClick={handleVerNoMapa3D}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl h-12 px-8 font-bold gap-2 shadow-lg"
            >
              Selecionar Marcha <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      </div>
    </ProtecaoPaciente>
  );
}