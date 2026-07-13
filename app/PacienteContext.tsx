"use client"
// nesse arquivo é a memória global
import { createContext, useContext, useState, ReactNode } from "react"

interface PacienteAtivo {
  id: string
  nome: string
}

// funções que podem usar para obter e mandar os dados
interface PacienteContextType {
  pacienteAtivo: PacienteAtivo | null
  setPacienteAtivo: (paciente: PacienteAtivo | null) => void
  analiseAtiva: string | null            
  setAnaliseAtiva: (nome: string | null) => void 
  jobIdAtivo: string | null   
  setJobIdAtivo: (id: string | null) => void 
}

// cria a caixa que vai ser compartilhada, começa vazia
const PacienteContext = createContext<PacienteContextType | undefined>(undefined)

// enche a caixa
export function PacienteProvider({ children }: { children: ReactNode }) {
  const [pacienteAtivo, setPacienteAtivoState] = useState<PacienteAtivo | null>(null)
  const [analiseAtiva, setAnaliseAtiva] = useState<string | null>(null)
  const [jobIdAtivo, setJobIdAtivo] = useState<string | null>(null) 

  // reseta a análise ativa sempre que o paciente muda, usuário fez logout ou apagou o paciente.
  const setPacienteAtivo = (paciente: PacienteAtivo | null) => {
    setPacienteAtivoState((pacienteAnterior) => {
      if (pacienteAnterior?.id !== paciente?.id) {
        setAnaliseAtiva(null)
        setJobIdAtivo(null) 
      }
      return paciente
    })
  }

  return (
    <PacienteContext.Provider 
      value={{ // distribui para todo mundo os dados
        pacienteAtivo, 
        setPacienteAtivo, 
        analiseAtiva, 
        setAnaliseAtiva,
        jobIdAtivo,   
        setJobIdAtivo 
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