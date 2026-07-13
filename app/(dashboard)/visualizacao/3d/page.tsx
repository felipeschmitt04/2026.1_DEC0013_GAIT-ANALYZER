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
  ArrowLeft,
  Loader2,
  Play,
  Pause,
  SkipForward,
  SkipBack
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

// URL base do processamento na Azure, o backend
const API_BASE_URL = "https://52-247-110-87.sslip.io";

// Carrega o motor 3D somente no navegador,
// pois o Three.js não funciona durante o processamento do servidor, por isso demora um pouco
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
// Componente principal responsável por buscar os dados
function ConteudoVisualizacao() {
  const { pacienteAtivo, analiseAtiva, jobIdAtivo } = usePaciente();
  const [metricas, setMetricas] = useState<DadosAnalise | null>(null);
  const [jsonBiomecanico, setJsonBiomecanico] = useState<any | null>(null);
  const [statusJob, setStatusJob] = useState<string>("loading");
  const [erroMensagem, setErroMensagem] = useState<string | null>(null);

  //  estados para o controle da animação 3D
  const [frameAtual, setFrameAtual] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const searchParams = useSearchParams();
  const segmentoId = searchParams.get("segmento");
  const router = useRouter(); 
  
  //  se vier o id ok, senão pega do PacienteContext
  const jobId = searchParams.get("jobId") || jobIdAtivo || "";
  
  const container3dRef = useRef<HTMLDivElement>(null);

  // fluxo de carregamento
  useEffect(() => {
    if (!jobId) {
      setErroMensagem("Nenhum identificador de análise foi fornecido.");
      setStatusJob("failed");
      return;
    }

    let encerrarPolling = false;

    const gerenciarFluxoDados = async () => {
      try {
        // puxar dados do banco
        const resLocal = await fetch("/api/analises");
        if (resLocal.ok) {
          const lista = await resLocal.json();
          const correspondente = lista.find((a: any) => a.id === jobId);
          if (correspondente) {
            setMetricas({
              cadencia: correspondente.cadencia,
              comprimento: correspondente.comprimento,
              velocidade: correspondente.velocidade,
              simetria: correspondente.simetria
            });
          }
        }

        // polling na Azure para garantir que o processamento terminou
        const STATUS_FINAIS = new Set(["completed", "failed", "failed_retryable"]);
        
        while (!encerrarPolling) {
          const resStatus = await fetch(`${API_BASE_URL}/status/${jobId}`);
          if (!resStatus.ok) throw new Error("Não foi possível validar o status na Azure.");
          
          const jobInfo = await resStatus.json();
          setStatusJob(jobInfo.status);

          if (STATUS_FINAIS.has(jobInfo.status)) {
            if (jobInfo.status === "completed") {
              // se completou, baixa o JSON biomecânico completo
              const resResultado = await fetch(`${API_BASE_URL}/results/${jobId}`);
              if (resResultado.ok) {
                const dadosFinais = await resResultado.json();
                if (dadosFinais.error) {
                  setErroMensagem(dadosFinais.error.message);
                  setStatusJob("failed");
                } else {
                  setJsonBiomecanico(dadosFinais.data);
                }
              }
            } else {
              setErroMensagem("Ocorreu uma falha no pipeline de IA da Azure.");
              setStatusJob("failed");
            }
            break;
          }
          
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }

      } catch (err: any) {
        console.error(err);
        setErroMensagem("Erro de comunicação com o servidor de processamento.");
        setStatusJob("failed");
      }
    };

    gerenciarFluxoDados();

    return () => {
      encerrarPolling = true;
    };
  }, [jobId]);

  // controla automaticamente a passagem dos frames
  useEffect(() => {
    if (!jsonBiomecanico || !isPlaying) return;

    const totalFrames = jsonBiomecanico.pose3d?.length || 1;
    const fpsOriginal = jsonBiomecanico.input_summary?.fps || 30;//frames por segundo, controla a velocidade aqui

    const relogio = setInterval(() => {
      setFrameAtual((prev) => (prev + 1) % totalFrames);//passa os frames
    }, 1000 / fpsOriginal);// tempo em que cada frame fica

    return () => clearInterval(relogio);//usuário para
  }, [jsonBiomecanico, isPlaying]);

  const totalFramesDisponiveis = jsonBiomecanico?.pose3d?.length || 1;
  //modo tela cheia
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

  //transforma radianos em graus, para exibir os ângulos
  const radParaGraus = (valorRad: number | null) => {
    if (valorRad == null) return "0";
    return (valorRad * 180 / Math.PI).toFixed(1);
  };
  //pega os ângulos especificos de cada parte
  const pegarValorFitting = (nomeCoordenada: string) => {
    const fitting = jsonBiomecanico?.fitting;
    if (!fitting) return null;
    const index = fitting.coordinate_names?.indexOf(nomeCoordenada);
    if (index < 0 || index == null) return null;
    // o ângulo específico no frame atual
    return fitting.angles?.[frameAtual]?.[index] ?? null;
  };

  // Valores exibidos enquanto a análise ainda está carregando
  let cardsDinamicos = [
    { label: "", value: "", unit: "", icon: Activity },
    { label: "", value: "", unit: "", icon: Ruler },
    { label: "", value: "", unit: "", icon: Activity },
    { label: "", value: "", unit: "", icon: CheckCircle2 },
  ];

  
  const estaAguardando = ["loading", "queued", "claimed", "running", "processing"].includes(statusJob);
  // texto dinâmico exibido 
  if (!estaAguardando && jsonBiomecanico) {
    const clinicas = jsonBiomecanico.metricas_clinicas;

    if (segmentoId === "perna-direita") {
      cardsDinamicos = [
        { 
          label: "Ângulo do Joelho Direito", 
          value: (clinicas?.joelho_direito_graus?.[frameAtual] ?? 0).toFixed(1), 
          unit: "°", 
          icon: Activity 
        },
        { 
          label: "Flexão do Quadril Direito", 
          value: (clinicas?.quadril_direito_graus?.[frameAtual] ?? 0).toFixed(1), 
          unit: "°", 
          icon: Info 
        },
        { 
          label: "Ângulo do Tornozelo Direito", 
          value: radParaGraus(pegarValorFitting("ankle_angle_r")), 
          unit: "°", 
          icon: Ruler 
        },
        { 
          label: "Segmento em Foco", 
          value: "Membro", 
          unit: "Inferior Dir.", 
          icon: CheckCircle2 
        },
      ];
    } else if (segmentoId === "perna-esquerda") {
      cardsDinamicos = [
        { 
          label: "Ângulo do Joelho Esquerdo", 
          value: (clinicas?.joelho_esquerdo_graus?.[frameAtual] ?? 0).toFixed(1), 
          unit: "°", 
          icon: Activity 
        },
        { 
          label: "Flexão do Quadril Esquerdo", 
          value: (clinicas?.quadril_esquerdo_graus?.[frameAtual] ?? 0).toFixed(1), 
          unit: "°", 
          icon: Info 
        },
        { 
          label: "Ângulo do Tornozelo Esquerdo", 
          value: radParaGraus(pegarValorFitting("ankle_angle_l")), 
          unit: "°", 
          icon: Ruler 
        },
        { 
          label: "Segmento em Foco", 
          value: "Membro", 
          unit: "Inferior Esq.", 
          icon: CheckCircle2 
        },
      ];
    } else if (segmentoId === "tronco-coluna") {
      cardsDinamicos = [
        { 
          label: "Largura da Passada (Tornozelos)", 
          value: (clinicas?.distancia_tornozelos_mm?.[frameAtual] ?? 0).toFixed(0), 
          unit: "mm", 
          icon: Ruler 
        },
        { 
          label: "Balanço do Braço Direito", 
          value: radParaGraus(pegarValorFitting("arm_flex_r")), 
          unit: "°", 
          icon: Activity 
        },
        { 
          label: "Balanço do Braço Esquerdo", 
          value: radParaGraus(pegarValorFitting("arm_flex_l")), 
          unit: "°", 
          icon: Activity 
        },
        { 
          label: "Alinhamento Postural", 
          value: "Sagital", 
          unit: "Estabilizado", 
          icon: Info 
        },
      ];
    }
  }

  if (statusJob === "failed") {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-center">
        <div className="bg-red-50 p-8 rounded-full mb-6">
          <AlertCircle size={48} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Falha no Processamento</h2>
        <p className="text-slate-500 max-w-md mt-2">
          {erroMensagem || "Não foi possível carregar os dados biomecânicos deste teste."}
        </p>
        <button onClick={() => router.back()} className="mt-6 bg-slate-900 text-white font-bold h-11 px-6 rounded-xl">
          Voltar e tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      
      {/* cabeçalho */}
      <div className="p-8 pb-4 flex justify-between items-end">
        <div className="flex items-start gap-4">
          {/* botão voltar */}
          <button 
            onClick={() => router.back()}
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
              <span className="font-bold text-emerald-600 uppercase tracking-tight">{analiseAtiva || "HISTÓRICO"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* divisão*/}
      <div className="flex-1 flex p-8 pt-2 gap-8 min-h-0">
        
        {/* lado esquerdo */}
        <div className="w-1/2 flex flex-col gap-6 overflow-y-auto pr-4 custom-scrollbar">
          <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <Info className="size-5 text-emerald-600" />
            Métricas Biomecânicas
          </h2>
          {/* cards com os dados */}
          <div className="grid gap-4">
            {cardsDinamicos.map((item, i) => (
              <div 
                key={i} 
                className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center justify-between"
              >

                {estaAguardando ? (
                  // Mostra um carregamento visual enquanto a IA processa os dados
                  <div className="flex items-center gap-4 w-full animate-pulse">
                    
                    {/* Ícone borrado */}
                    <div className="bg-slate-200 w-12 h-12 rounded-xl"></div>

                    {/* Texto borrado */}
                    <div className="flex flex-col gap-2">
                      <div className="bg-slate-200 h-3 w-36 rounded"></div>
                      <div className="bg-slate-200 h-7 w-20 rounded"></div>
                    </div>

                  </div>
                ) : (
                  // Exibe as métricas reais após o processamento terminar
                  <div className="flex items-center gap-4">
                    
                    <div className="bg-white p-3 rounded-xl shadow-sm">
                      <item.icon className="size-6 text-emerald-600" />
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {item.label}
                      </p>

                      <p className="text-2xl font-bold text-slate-800">
                        {item.value}{" "}
                        <span className="text-sm font-normal text-slate-500">
                          {item.unit}
                        </span>
                      </p>
                    </div>

                  </div>
                )}

              </div>
            ))}
          </div>


          <div className="mt-auto p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100">
            <h3 className="font-bold text-emerald-900 mb-1">
              Foco Ativo
            </h3>

            <p className="text-emerald-700 text-sm capitalize">
              Isolamento biomecânico:{" "}
              <strong className="font-bold">
                {segmentoId?.replace("-", " ")}
              </strong>
            </p>
          </div>
        </div>
        {/* lado direito */}
        <div className="w-1/2 flex flex-col gap-4 min-h-0">
          
          {/* quadrado modelo 3d */}
          <div 
            ref={container3dRef} 
            className="flex-1 relative bg-slate-900 rounded-[2.5rem] shadow-2xl border-8 border-slate-800 overflow-hidden"
          >{/* fundo quadriculado do quadrado */}
            <div 
              className="absolute inset-0 opacity-10 pointer-events-none" 
              style={{ 
                backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)',
                backgroundSize: '40px 40px' 
              }} 
            />

            <div className="absolute inset-0 flex items-center justify-center z-10">
              {estaAguardando ? (
                <div className="text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin text-slate-500 size-6" />
                  <p className="font-mono text-xs tracking-widest">AGUARDANDO COORDENADAS 3D...</p>
                </div>
              ) : (
                <ModelosCanvas segmentoId={segmentoId} dadosBiomecanicos={jsonBiomecanico} frameAtual={frameAtual} />
              )}
            </div>

            <div className="absolute bottom-6 right-6 z-20">
              {/* botão tela cheia */}
              <button 
                type="button" 
                onClick={handleToggleFullscreen}
                className="bg-slate-800/80 backdrop-blur hover:bg-slate-700 p-3 rounded-xl border border-slate-700 text-slate-300 transition-all active:scale-95 shadow-xl"
                title="Alternar Tela Cheia"
              >
                <Maximize2 size={20} />
              </button>
            </div>
          </div>

          {/* timeline */}
          {!estaAguardando && jsonBiomecanico && (
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3 shadow-xl text-slate-300">
              <div className="flex items-center gap-4">
                
                
                <div className="flex items-center gap-1.5">
                  {/* Botão voltar */}
                  <button 
                    onClick={() => setFrameAtual((prev) => (prev - 1 + totalFramesDisponiveis) % totalFramesDisponiveis)}
                    className="hover:bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-white active:scale-95 transition-all"
                    title="Frame Anterior"
                  >
                    <SkipBack size={18} />
                  </button>
                  
                  {/* Botão pausar;despausar */}
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="bg-emerald-600 hover:bg-emerald-500 p-2.5 rounded-xl text-white transition-transform active:scale-95 shadow-md shadow-emerald-900/30"
                    title={isPlaying ? "Pausar" : "Iniciar"}
                  >
                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                  </button>
                  
                  {/* Botão avançar */}
                  <button 
                    onClick={() => setFrameAtual((prev) => (prev + 1) % totalFramesDisponiveis)}
                    className="hover:bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-white active:scale-95 transition-all"
                    title="Próximo Frame"
                  >
                    <SkipForward size={18} />
                  </button>
                </div>

                {/* Slider */}
                <input 
                  type="range" 
                  min={0} 
                  max={totalFramesDisponiveis - 1} 
                  value={frameAtual} 
                  onChange={(e) => {
                    setIsPlaying(false); 
                    setFrameAtual(Number(e.target.value));
                  }}
                  className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 outline-none"
                />

                {/* número do frame */}
                <span className="font-mono text-xs text-slate-400 whitespace-nowrap bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  Frame: <strong className="text-emerald-400">{frameAtual + 1}</strong> / {totalFramesDisponiveis}
                </span>

              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

// Exportação padrão envolvendo a página com Suspense
export default function Visualizacao3DPage() {
  return (
    <ProtecaoPaciente>
      <Suspense fallback={<div className="p-10 text-center text-slate-500">Carregando visualizador...</div>}>
        <ConteudoVisualizacao />
      </Suspense>
    </ProtecaoPaciente>
  );
}