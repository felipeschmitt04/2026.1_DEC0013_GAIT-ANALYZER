"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ProtecaoPaciente } from "@/components/ProtecaoPaciente";
import { usePaciente } from "@/app/PacienteContext";
import { UploadCloud, FileVideo, X, CheckCircle2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function NovaAnalisePage() {
  // 🌟 O pacienteAtivo agora é um objeto { id, nome } ou null
  const { pacienteAtivo, setAnaliseAtiva } = usePaciente(); 
  const router = useRouter();
  
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [nomeAnalise, setNomeAnalise] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validarArquivo = (arquivo: File) => {
    if (arquivo.type === "video/mp4") {
      setFile(arquivo);
    } else {
      alert("Erro: Apenas arquivos de vídeo no formato MP4 são permitidos.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validarArquivo(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validarArquivo(e.target.files[0]);
    }
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalisar = async () => {
    // 🌟 CORRIGIDO: Verifica se o ID do paciente ativo existe no objeto do contexto
    if (!file || !nomeAnalise || !pacienteAtivo?.id) return;
    
    try {
      setEnviando(true);

      // 🚀 VANTAGEM DO NOVO CONTEXTO: O id já está na mão!
      // Removemos todo aquele fetch pesado que consultava a lista de pacientes.
      const resAnalise = await fetch("/api/analises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nomeAnalise,
          pacienteId: pacienteAtivo.id, // ID direto daqui!
          videoName: file.name
        }),
      });

      if (resAnalise.ok) {
        setAnaliseAtiva(nomeAnalise); 
        router.push("/visualizacao");
      } else {
        alert("Erro ao salvar a análise no servidor.");
      }
    } catch (error: any) {
      console.error(error);
      alert("Ocorreu um erro no processamento.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ProtecaoPaciente>
      <div className="p-10 max-w-5xl mx-auto">
        <div className="flex flex-col mb-8">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            Nova Análise
          </h1>
          <p className="text-slate-500">
            Faça o upload do vídeo da marcha para processamento biomecânico.
          </p>
        </div>

        {/* ÁREA DE UPLOAD */}
        <div
          className={cn(
            "relative w-full h-[450px] border-2 border-dashed rounded-3xl transition-all flex flex-col items-center justify-center gap-4 cursor-pointer",
            dragActive 
              ? "border-emerald-500 bg-emerald-50/50" 
              : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300",
            file ? "border-solid border-emerald-200 bg-white" : ""
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4"
            className="hidden"
            onChange={handleChange}
            disabled={enviando}
          />

          {file && (
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeFile(e);
              }}
              className="absolute top-6 right-6 bg-slate-100 hover:bg-red-100 hover:text-red-600 transition-colors rounded-full p-2 text-slate-500 z-30 shadow-sm"
              disabled={enviando}
            >
              <X size={24} />
            </button>
          )}

          {!file ? (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <UploadCloud className="size-12 text-emerald-600" />
              </div>
              <div className="text-center px-6">
                <p className="text-lg font-semibold text-slate-700">
                  Clique para procurar ou arraste para inserir o vídeo
                </p>
                <p className="text-sm text-slate-400">
                  Apenas arquivos MP4 são suportados
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
              <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100">
                <FileVideo className="size-20 text-emerald-600" />
              </div>
              <div className="text-center px-10">
                <p className="text-xl font-bold text-slate-800 break-all">{file.name}</p>
                <p className="text-sm text-emerald-600 flex items-center justify-center gap-2 mt-2 font-medium">
                  <CheckCircle2 size={16} /> Vídeo carregado • Clique ou arraste para trocar
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ: NOME DA MARCHA E BOTÃO */}
        <div className="mt-8 flex items-center gap-4 bg-white p-2 rounded-2xl">
          <div className="relative flex-1 group">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <Input 
              placeholder="Dê um nome para esta análise (ex: Caminhada Pós-Cirúrgica 01)"
              value={nomeAnalise}
              onChange={(e) => setNomeAnalise(e.target.value)}
              disabled={enviando}
              className="h-14 pl-12 rounded-xl border-slate-200 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
            />
          </div>

          <Button
            disabled={!file || !nomeAnalise || enviando}
            onClick={handleAnalisar}
            className="h-14 px-10 rounded-xl text-lg font-bold bg-slate-900 hover:bg-slate-800 shadow-xl disabled:opacity-50 disabled:bg-slate-300 transition-all active:scale-95 text-white flex items-center gap-2"
          >
            {enviando ? "Processando..." : "Analisar Marcha"}
          </Button>
        </div>
      </div>
    </ProtecaoPaciente>
  );
}