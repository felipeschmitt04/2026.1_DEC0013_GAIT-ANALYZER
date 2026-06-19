"use client"

import { createContext, useContext, useState, ReactNode } from "react"

// 🌟 Interface para estruturar o objeto do paciente ativo
interface PacienteAtivo {
  id: string
  nome: string
}

interface PacienteContextType {
  pacienteAtivo: PacienteAtivo | null
  setPacienteAtivo: (paciente: PacienteAtivo | null) => void
  analiseAtiva: string | null            
  setAnaliseAtiva: (nome: string | null) => void 
}

const PacienteContext = createContext<PacienteContextType | undefined>(undefined)

export function PacienteProvider({ children }: { children: ReactNode }) {
  const [pacienteAtivo, setPacienteAtivoState] = useState<PacienteAtivo | null>(null)
  const [analiseAtiva, setAnaliseAtiva] = useState<string | null>(null)

  // 🌟 NOVO: substitui o setPacienteAtivo "cru" por uma versão que também
  // reseta a análise ativa sempre que o paciente muda (ou é deslogado/null).
  // Isso evita que uma análise de um paciente antigo continue "presa"
  // depois de selecionar outro paciente.
  const setPacienteAtivo = (paciente: PacienteAtivo | null) => {
    setPacienteAtivoState((pacienteAnterior) => {
      // Só reseta a análise se o paciente realmente mudou (id diferente)
      if (pacienteAnterior?.id !== paciente?.id) {
        setAnaliseAtiva(null)
      }
      return paciente
    })
  }

  return (
    <PacienteContext.Provider 
      value={{ 
        pacienteAtivo, 
        setPacienteAtivo, 
        analiseAtiva, 
        setAnaliseAtiva 
      }}
    >
      {children}
    </PacienteContext.Provider>
  )
}

export const usePaciente = () => {
  const context = useContext(PacienteContext)
  if (!context) {
    throw new Error("usePaciente deve ser usado dentro de um PacienteProvider")
  }
  return context
}