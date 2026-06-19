"use client"; 

import { usePaciente } from "@/app/PacienteContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, ReactNode } from "react";

export function ProtecaoPaciente({ children }: { children: ReactNode }) {
  const { pacienteAtivo } = usePaciente();
  const router = useRouter();
  const [podeExibir, setPodeExibir] = useState(false);

  useEffect(() => {
    if (!pacienteAtivo) {
      // Se não tem paciente selecionado, manda de volta para a lista
      router.push("/pacientes");
    } else {
      // Se tem paciente, libera a visualização
      setPodeExibir(true);
    }
  }, [pacienteAtivo, router]);// se mudar paciente roda de novo

  // Enquanto o useEffect checa a proteção, não mostra nada (evita o "flash" da página proibida)
  if (!podeExibir) return null;

  return <>{children}</>;
}