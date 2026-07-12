"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ProtecaoPaciente } from "@/components/ProtecaoPaciente";
import { usePaciente } from "@/app/PacienteContext";
import { UploadCloud, FileVideo, X, CheckCircle2, Tag, Smartphone, Monitor, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function NovaAnalisePage() {
  const { pacienteAtivo, setAnaliseAtiva, setJobIdAtivo } = usePaciente(); 
  const router = useRouter();
  
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [nomeAnalise, setNomeAnalise] = useState("");
  const [alturaCm, setAlturaCm] = useState(""); // Novo campo de altura em cm
  const [enviando, setEnviando] = useState(false);
  
  const [orientacao, setOrientacao] = useState<"em-pe" | "deitado">("em-pe");
  
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
    // Valida se todos os parâmetros obrigatórios foram preenchidos
    if (!file || !nomeAnalise || !alturaCm || !pacienteAtivo?.id) {
      alert("Por favor, preencha todos os campos antes de continuar.");
      return;
    }
    
    try {
      setEnviando(true);

      // Converte a altura de centímetros para milímetros (Ex: 175cm -> 1750mm)
      const heightMm = Math.round(parseFloat(alturaCm) * 10);
      
      // Define a rotação com base na orientação selecionada
      const rotated = orientacao === "deitado";

      // Cria o FormData necessário para upload de arquivos na API do backend
      const formData = new FormData();
      formData.append("video", file); // Arquivo de vídeo real
      formData.append("height_mm", String(heightMm)); // Altura em mm exigida pelo backend
      formData.append("rotated", String(rotated)); // Envia a flag de rotação
      formData.append("nome", nomeAnalise);
      formData.append("pacienteId", pacienteAtivo.id);

      // Dispara a requisição para a sua rota interna da API Next.js
      const resAnalise = await fetch("/api/analises", {
        method: "POST",
        body: formData, // Envia o formData completo ao invés do JSON string
      });

      if (resAnalise.ok) {
        const dadosJob = await resAnalise.json();
        
        // Define o nome da análise ativa no contexto
        setAnaliseAtiva(nomeAnalise); 
        
        //  ALTERAÇÃO AQUI: Salva o ID retornado pelo servidor no Contexto Global na mesma hora
        setJobIdAtivo(dadosJob.job_id || null);
        
        // Redireciona para a tela de visualização passando o id do processamento (job_id)
        router.push(`/visualizacao?jobId=${dadosJob.job_id || ""}`);
      } else {
        alert("Erro ao salvar e iniciar a análise no servidor.");
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
            "relative w-full h-[400px] border-2 border-dashed rounded-3xl transition-all flex flex-col items-center justify-center gap-4 cursor-pointer",
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

        {/* CAMPOS ADICIONAIS: NOME E ALTURA */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative group md:col-span-2">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <Input 
              placeholder="Dê um nome para esta análise (ex: Caminhada Pós-Cirúrgica 01)"
              value={nomeAnalise}
              onChange={(e) => setNomeAnalise(e.target.value)}
              disabled={enviando}
              className="h-14 pl-12 rounded-xl border-slate-200 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
            />
          </div>

          <div className="relative group">
            <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <Input 
              type="number"
              placeholder="Altura do paciente (cm)"
              value={alturaCm}
              onChange={(e) => setAlturaCm(e.target.value)}
              disabled={enviando}
              className="h-14 pl-12 rounded-xl border-slate-200 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
            />
          </div>
        </div>

        {/* RODAPÉ: SELETOR DE ORIENTAÇÃO E BOTÃO DE ENVIO */}
        <div className="mt-4 flex items-center justify-end gap-4 bg-white p-2 rounded-2xl shadow-sm">
          <Button
            type="button"
            variant="outline"
            disabled={enviando}
            onClick={(e) => {
              e.stopPropagation();
              setOrientacao((prev) => (prev === "em-pe" ? "deitado" : "em-pe"));
            }}
            className={cn(
              "h-14 px-5 rounded-xl border font-semibold flex items-center gap-2 transition-all active:scale-95",
              orientacao === "em-pe" 
                ? "border-emerald-200 bg-emerald-50/40 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800" 
                : "border-blue-200 bg-blue-50/40 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
            )}
          >
            {orientacao === "em-pe" ? (
              <>
                <Smartphone size={18} /> Vídeo: Em Pé
              </>
            ) : (
              <>
                <Monitor size={18} /> Vídeo: Deitado
              </>
            )}
          </Button>

          <Button
            disabled={!file || !nomeAnalise || !alturaCm || enviando}
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