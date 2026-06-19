"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtecaoPaciente } from "@/components/ProtecaoPaciente";
import { usePaciente } from "@/app/PacienteContext";
import { FileText, Calendar, ChevronRight, FileDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Analise {
  id: string; // Atualizado para string (UUID do Prisma)
  nome: string;
  data: string; // Formato YYYY-MM-DD
}

export default function RelatoriosPage() {
  // 🌟 O pacienteAtivo agora é um objeto { id, nome } ou null
  const { pacienteAtivo, setAnaliseAtiva } = usePaciente();
  const router = useRouter();

  const [analises, setAnalises] = useState<Analise[]>([]);
  const [selecionadaLocal, setSelecionadaLocal] = useState<Analise | null>(null);
  const [loading, setLoading] = useState(true);

  // 🚀 Busca as análises do paciente ativo no Supabase
  useEffect(() => {
    // 🌟 Ajustado para verificar se o id do paciente ativo existe no contexto
    if (!pacienteAtivo?.id) return;

    const carregarHistorico = async () => {
      try {
        setLoading(true);
        
        // 🔥 SUPER OTIMIZAÇÃO: Não precisamos mais do 'fetch("/api/pacientes")'! 
        // O id do paciente já está disponível direto no contexto global.
        const resAnalises = await fetch("/api/analises");
        if (resAnalises.ok) {
          const todasAnalises = await resAnalises.json();
          
          // Filtra deixando apenas as que pertencem ao id desse paciente
          const filtradas = todasAnalises.filter((a: any) => a.pacienteId === pacienteAtivo.id);
          setAnalises(filtradas);
        }
      } catch (err) {
        console.error("Erro ao carregar histórico:", err);
      } finally {
        setLoading(false);
      }
    };

    carregarHistorico();
  }, [pacienteAtivo]);

  const formatarDataBR = (dataStr: string) => {
    try {
      const parts = dataStr.split("-");
      if (parts.length !== 3) return dataStr;
      const [ano, mes, dia] = parts;
      return `${dia}/${mes}/${ano}`;
    } catch {
      return dataStr;
    }
  };

  const handleVerNoMapa3D = () => {
    if (!selecionadaLocal) return;
    setAnaliseAtiva(selecionadaLocal.nome);
    router.push("/visualizacao");
  };

  const handleGerarPDF = () => {
    if (!selecionadaLocal) return;
    alert(`Gerando relatório em PDF para: ${selecionadaLocal.nome}`);
  };

  return (
    <ProtecaoPaciente>
      <div className="h-full flex flex-col p-10 max-w-6xl mx-auto w-full">
        
        {/* CABEÇALHO */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Relatórios</h1>
          <p className="text-slate-500">
            {/* 🌟 CORRIGIDO: Exibe apenas o texto do nome do objeto do paciente ativo */}
            Escolha qual análise de <span className="font-bold text-emerald-600">{pacienteAtivo?.nome}</span> deseja visualizar ou exportar.
          </p>
        </div>

        {/* LISTA DE ANÁLISES (BLOCOS) */}
        {loading ? (
          <div className="flex-1 py-20 text-center text-slate-500 font-medium">
            Carregando histórico do Supabase...
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start overflow-y-auto pr-2">
            {analises.length > 0 ? (
              analises.map((analise) => (
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
                      {formatarDataBR(analise.data)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center text-slate-400">
                Nenhuma análise registrada para este paciente ainda.
              </div>
            )}
          </div>
        )}

        {/* BARRA DE AÇÕES (RODAPÉ) */}
        <div className={cn(
          "mt-8 p-4 bg-slate-900 rounded-3xl flex flex-col sm:flex-row gap-4 items-center justify-between transition-all transform duration-300",
          selecionadaLocal ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"
        )}>
          <div className="pl-4 text-center sm:text-left">
            <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Selecionado:</p>
            <p className="text-white font-medium">{selecionadaLocal?.nome}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              onClick={handleGerarPDF}
              variant="outline"
              className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white rounded-2xl h-12 px-6 gap-2 w-full sm:w-auto text-white"
            >
              <FileDown size={18} /> Emitir em PDF
            </Button>

            <Button
              onClick={handleVerNoMapa3D}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl h-12 px-8 font-bold gap-2 shadow-lg w-full sm:w-auto"
            >
              Selecionar Marcha <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      </div>
    </ProtecaoPaciente>
  );
}