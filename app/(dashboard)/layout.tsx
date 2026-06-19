"use client" 

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/ui/app-sidebar"
import { usePaciente } from "../PacienteContext" 

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { pacienteAtivo } = usePaciente()

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50"> 
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          {/* Barra superior */}
          <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <div className="h-6 w-px bg-border" />
            
            {/* Título Dinâmico */}
            <h1 className="text-sm font-medium transition-all">
              {pacienteAtivo?.nome 
                ? `Paciente selecionado: ${pacienteAtivo.nome}` 
                : "Selecione um paciente"}
            </h1>
          </header>
          
          {/* Conteúdo da página */}
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}