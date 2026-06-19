"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface PacienteAtivo {
  id: string
  nome: string
}
// quais dados e funções podem usar
interface PacienteContextType {
  pacienteAtivo: PacienteAtivo | null
  setPacienteAtivo: (paciente: PacienteAtivo | null) => void
  analiseAtiva: string | null            
  setAnaliseAtiva: (nome: string | null) => void 
}
// cria os dados que vão ser compartilhados, começa vazia
const PacienteContext = createContext<PacienteContextType | undefined>(undefined)

export function PacienteProvider({ children }: { children: ReactNode }) {
  const [pacienteAtivo, setPacienteAtivoState] = useState<PacienteAtivo | null>(null)
  const [analiseAtiva, setAnaliseAtiva] = useState<string | null>(null)

  // reseta a análise ativa sempre que o paciente muda (ou é deslogado/null).
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
      value={{ // distribui para todo mundo
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

export const usePaciente = () => {//função que os locais vão usar para pegar os dados
  const context = useContext(PacienteContext)// pega da nuvem
  if (!context) {// erro caso esquecer de envelopar
    throw new Error("usePaciente deve ser usado dentro de um PacienteProvider")
  }
  return context
}