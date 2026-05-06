"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface PacienteContextType {
  pacienteAtivo: string | null
  setPacienteAtivo: (nome: string | null) => void
  analiseAtiva: string | null            // Nova propriedade
  setAnaliseAtiva: (nome: string | null) => void // Nova propriedade
}

const PacienteContext = createContext<PacienteContextType | undefined>(undefined)

export function PacienteProvider({ children }: { children: ReactNode }) {
  const [pacienteAtivo, setPacienteAtivo] = useState<string | null>(null)
  const [analiseAtiva, setAnaliseAtiva] = useState<string | null>(null)

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