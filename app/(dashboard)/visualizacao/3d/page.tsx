"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation"; 
import { ProtecaoPaciente } from "@/components/ProtecaoPaciente";
import { usePaciente } from "@/app/PacienteContext";
import { 
  Info, 
  Activity, 
  Ruler, 
  Maximize2, 
  CheckCircle2,
  AlertCircle,
  ArrowLeft 
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Importação dinâmica do componente de modelos 3D desativando o SSR
const ModelosCanvas = dynamic(() => import("../../components/modelos"), {
  ssr: false,
  loading: () => (
    <p className="text-emerald-400/70 font-mono text-xs animate-pulse tracking-widest">
      INICIANDO MOTOR GRÁFICO...
    </p>
  )
});

interface DadosAnalise {
  cadencia: string;
  comprimento: string;
  velocidade: string;
  simetria: string;
}

function ConteudoVisualizacao() {
  const { pacienteAtivo, analiseAtiva } = usePaciente();
  const [metricas, setMetricas] = useState<DadosAnalise | null>(null);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const segmentoId = searchParams.get("segmento");
  const router = useRouter(); 
  
  const container3dRef = useRef<HTMLDivElement>(null);

  // Carrega os parâmetros reais calculados no banco de dados
  useEffect(() => {
    if (!analiseAtiva) return;

    const puxarMetricasReais = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/analises");
        if (res.ok) {
          const lista = await res.json();
          const correspondente = lista.find((a: any) => a.nome === analiseAtiva);
          
          if (correspondente) {
            setMetricas({
              cadencia: correspondente.cadencia,
              comprimento: correspondente.comprimento,
              velocidade: correspondente.velocidade,
              simetria: correspondente.simetria
            });
          }
        }
      } catch (err) {
        console.error("Erro ao buscar métricas da análise:", err);
      } finally {
        setLoading(false);
      }
    };

    puxarMetricasReais();
  }, [analiseAtiva]);

  const handleToggleFullscreen = () => {
    if (!container3dRef.current) return;

    if (!document.fullscreenElement) {
      container3dRef.current.requestFullscreen().catch((err) => {
        console.error(`Erro ao tentar ativar tela cheia: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  if (!analiseAtiva) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-center">
        <div className="bg-slate-50 p-8 rounded-full mb-6">
          <AlertCircle size={48} className="text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Nenhuma análise selecionada</h2>
        <p className="text-slate-500 max-w-md mt-2">
          Para visualizar os dados 3D, selecione uma análise existente em <strong>Relatórios</strong> ou realize uma <strong>Nova Análise</strong>.
        </p>
        <Link href="/relatorio" className="mt-6 text-emerald-600 font-bold hover:underline">
          Ir para Relatórios →
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      
      {/* CABEÇALHO COM PACIENTE + NOME DA ANÁLISE + BOTÃO VOLTAR */}
      <div className="p-8 pb-4 flex justify-between items-end">
        <div className="flex items-start gap-4">
          <button 
            onClick={() => router.push("/visualizacao")}
            className="mt-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 p-2.5 rounded-xl text-slate-600 transition-all active:scale-95 shadow-sm"
            title="Voltar para Foco da Análise"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
              Visualização 3D
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-500">Paciente:</span>
              <span className="font-semibold text-slate-700">{pacienteAtivo?.nome}</span>
              <span className="text-slate-300 mx-1">|</span>
              <span className="text-slate-500">Análise:</span>
              <span className="font-bold text-emerald-600 uppercase tracking-tight">{analiseAtiva}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTEÚDO DIVIDIDO (50/50) */}
      <div className="flex-1 flex p-8 pt-2 gap-8 min-h-0">
        
        {/* LADO ESQUERDO: DADOS */}
        <div className="w-1/2 flex flex-col gap-6 overflow-y-auto pr-4 custom-scrollbar">
          <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <Info className="size-5 text-emerald-600" />
            Métricas Biomecânicas
          </h2>

          {loading ? (
            <div className="py-20 text-center text-slate-400 font-medium animate-pulse">
              Sincronizando telemetria...
            </div>
          ) : (
            <div className="grid gap-4">
              {[
                { label: "Cadência", value: metricas?.cadencia || "0", unit: "passos/min", icon: Activity },
                { label: "Comprimento do Passo", value: metricas?.comprimento || "0", unit: "m", icon: Ruler },
                { label: "Velocidade", value: metricas?.velocidade || "0", unit: "m/s", icon: Activity },
                { label: "Simetria", value: metricas?.simetria || "0", unit: "%", icon: CheckCircle2 },
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-xl shadow-sm">
                      <item.icon className="size-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</p>
                      <p className="text-2xl font-bold text-slate-800">
                        {item.value} <span className="text-sm font-normal text-slate-500">{item.unit}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-auto p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100">
            <h3 className="font-bold text-emerald-900 mb-1">Foco Ativo</h3>
            <p className="text-emerald-700 text-sm capitalize">
              Isolamento biomecânico: <strong className="font-bold">{segmentoId?.replace("-", " ")}</strong>
            </p>
          </div>
        </div>

        {/* LADO DIREITO: VISUALIZAÇÃO 3D COMPONENTIZADA */}
        <div 
          ref={container3dRef} 
          className="w-1/2 relative bg-slate-900 rounded-[2.5rem] shadow-2xl border-8 border-slate-800 overflow-hidden"
        >
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none" 
            style={{ 
              backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)',
              backgroundSize: '40px 40px' 
            }} 
          />

          <div className="absolute inset-0 flex items-center justify-center z-10">
            <ModelosCanvas segmentoId={segmentoId} />
          </div>

          {/* CONTROLES FLUTUANTES */}
          <div className="absolute bottom-10 right-10 flex gap-3 z-20">
            <button 
              type="button" 
              onClick={handleToggleFullscreen}
              className="bg-slate-800/80 backdrop-blur hover:bg-slate-700 p-4 rounded-2xl border border-slate-700 text-slate-300 shadow-xl transition-all active:scale-95"
              title="Alternar Tela Cheia"
            >
              <Maximize2 size={24} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function Visualizacao3DPage() {
  return (
    <ProtecaoPaciente>
      <Suspense fallback={<div className="p-10 text-center text-slate-500">Carregando visualizador...</div>}>
        <ConteudoVisualizacao />
      </Suspense>
    </ProtecaoPaciente>
  );
}