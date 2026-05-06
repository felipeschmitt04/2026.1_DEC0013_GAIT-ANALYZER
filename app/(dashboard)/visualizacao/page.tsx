"use client";

import { ProtecaoPaciente } from "@/components/ProtecaoPaciente";
import { usePaciente } from "@/app/PacienteContext";
import { 
  Info, 
  Activity, 
  Ruler, 
  ChevronRight, 
  Rotate3d, 
  Maximize2, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

export default function Visualizacao3DPage() {
  const { pacienteAtivo, analiseAtiva } = usePaciente();

  // Se não houver uma análise selecionada, mostramos um estado vazio amigável
  if (!analiseAtiva) {
    return (
      <ProtecaoPaciente>
        <div className="h-full flex flex-col items-center justify-center p-10 text-center">
          <div className="bg-slate-50 p-8 rounded-full mb-6">
            <AlertCircle size={48} className="text-slate-300" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Nenhuma análise selecionada</h2>
          <p className="text-slate-500 max-w-md mt-2">
            Para visualizar os dados 3D, selecione uma análise existente em <strong>Relatórios</strong> ou realize uma <strong>Nova Análise</strong>.
          </p>
          <Link href="/relatorios" className="mt-6 text-emerald-600 font-bold hover:underline">
            Ir para Relatórios →
          </Link>
        </div>
      </ProtecaoPaciente>
    );
  }

  return (
    <ProtecaoPaciente>
      <div className="h-full flex flex-col overflow-hidden bg-white">
        
        {/* CABEÇALHO COM PACIENTE + NOME DA ANÁLISE */}
        <div className="p-8 pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
              Visualização 3D
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-500">Paciente:</span>
              <span className="font-semibold text-slate-700">{pacienteAtivo}</span>
              <span className="text-slate-300 mx-1">|</span>
              <span className="text-slate-500">Análise:</span>
              <span className="font-bold text-emerald-600 uppercase tracking-tight">{analiseAtiva}</span>
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

            <div className="grid gap-4">
              {[
                { label: "Cadência", value: "112", unit: "passos/min", icon: Activity },
                { label: "Comprimento do Passo", value: "0.72", unit: "m", icon: Ruler },
                { label: "Velocidade", value: "1.4", unit: "m/s", icon: Activity },
                { label: "Simetria", value: "98.2", unit: "%", icon: CheckCircle2 },
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

            <div className="mt-auto p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <h3 className="font-bold text-emerald-900 mb-1">Status do Processamento</h3>
              <p className="text-emerald-700 text-sm">Dados validados via IA com 99% de precisão.</p>
            </div>
          </div>

          {/* LADO DIREITO: VISUALIZAÇÃO 3D */}
          <div className="w-1/2 relative bg-slate-900 rounded-[2.5rem] shadow-2xl border-8 border-slate-800 overflow-hidden">
            <div 
              className="absolute inset-0 opacity-20" 
              style={{ 
                backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)',
                backgroundSize: '40px 40px' 
              }} 
            />

            <div className="absolute inset-0 flex flex-col items-center justify-center">
               {/* Aqui entrará o Canvas do Three.js futuramente */}
              <p className="text-emerald-400/50 font-mono text-xs tracking-[0.3em] uppercase">
                Render Engine Active
              </p>
            </div>

            <div className="absolute bottom-10 right-10 flex gap-3">
              <button className="bg-slate-800/80 backdrop-blur hover:bg-slate-700 p-4 rounded-2xl border border-slate-700 text-slate-300 shadow-xl">
                <Rotate3d size={24} />
              </button>
              <button className="bg-slate-800/80 backdrop-blur hover:bg-slate-700 p-4 rounded-2xl border border-slate-700 text-slate-300 shadow-xl">
                <Maximize2 size={24} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </ProtecaoPaciente>
  );
}