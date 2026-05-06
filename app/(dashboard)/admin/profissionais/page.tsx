"use client"

import { useState } from "react"
import { Plus, X, User, Search, Briefcase, IdCard, Edit3, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface Profissional {
  id: number;
  nome: string;
  especialidade: string;
  registro: string;
  unidade: string;
  observacoes: string;
}

export default function ProfissionaisPage() {
  const [showModalCadastro, setShowModalCadastro] = useState(false)
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<Profissional | null>(null)
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  
  // --- ESTADOS DE BUSCA E PAGINAÇÃO ---
  const [busca, setBusca] = useState("")
  const [paginaAtual, setPaginaAtual] = useState(1)
  const itensPorPagina = 12 

  // Filtra pelo nome
  const filtrados = profissionais.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  )

  // Ordena alfabeticamente
  const ordenados = [...filtrados].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  )

  const totalPaginas = Math.ceil(ordenados.length / itensPorPagina)
  const indiceUltimo = paginaAtual * itensPorPagina
  const indicePrimeiro = indiceUltimo - itensPorPagina
  const exibidos = ordenados.slice(indicePrimeiro, indiceUltimo)

  const handleBusca = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusca(e.target.value)
    setPaginaAtual(1)
  }

  const handleSaveNovo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const novo: Profissional = {
      id: Date.now(),
      nome: formData.get("nome") as string,
      especialidade: formData.get("especialidade") as string,
      registro: formData.get("registro") as string,
      unidade: formData.get("unidade") as string,
      observacoes: formData.get("observacoes") as string,
    }
    setProfissionais([novo, ...profissionais])
    setShowModalCadastro(false)
  }

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!profissionalSelecionado) return
    const formData = new FormData(e.currentTarget)
    const listaAtualizada = profissionais.map(p => {
      if (p.id === profissionalSelecionado.id) {
        return {
          ...p,
          nome: formData.get("nome") as string,
          especialidade: formData.get("especialidade") as string,
          registro: formData.get("registro") as string,
          unidade: formData.get("unidade") as string,
          observacoes: formData.get("observacoes") as string,
        }
      }
      return p
    })
    setProfissionais(listaAtualizada)
    setProfissionalSelecionado(null)
  }

  const handleDelete = () => {
    if (!profissionalSelecionado) return
    
    const confirmar = window.confirm(`Deseja realmente excluir o profissional ${profissionalSelecionado.nome}?`)
    
    if (confirmar) {
      setProfissionais(profissionais.filter(p => p.id !== profissionalSelecionado.id))
      setProfissionalSelecionado(null)
    }
  }

  return (
    <div style={{ padding: '24px', position: 'relative' }}>
      
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', gap: '12px' }}>
        <div style={{ flex: '0 0 auto' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: '#0f172a', margin: 0, lineHeight: '1.2' }}>Profissionais</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Gerencie o acesso dos profissionais de saúde.</p>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 20px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '450px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 10 }} />
            <input 
              placeholder="Buscar por nome..." 
              value={busca}
              onChange={handleBusca}
              style={{ height: '48px', width: '100%', paddingLeft: '44px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', outline: 'none' }} 
            />
          </div>
        </div>

        <Button onClick={() => setShowModalCadastro(true)} style={{ height: '48px', paddingLeft: '24px', paddingRight: '24px' }} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg transition-all active:scale-95 font-semibold">
          <Plus className="size-5 mr-2" /> Novo Profissional
        </Button>
      </div>

      {/* LISTA DE CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {exibidos.length > 0 ? (
          exibidos.map((p) => (
            <div 
              key={p.id} 
              onClick={() => setProfissionalSelecionado(p)}
              style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s', cursor: 'pointer' }} 
              className="hover:border-emerald-200 hover:shadow-md active:scale-95"
            >
              <div style={{ backgroundColor: '#f8fafc', minWidth: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={22} className="text-slate-600" />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <h3 style={{ fontWeight: 'bold', color: '#1e293b', margin: 0, fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</h3>
                <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}><Briefcase size={12} /> {p.especialidade}</span>
                  <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}><IdCard size={12} /> {p.registro}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-slate-400">
            Nenhum profissional encontrado.
          </div>
        )}
      </div>

      {/* PAGINAÇÃO */}
      {totalPaginas > 1 && (
        <div style={{ marginTop: '32px' }}>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); if (paginaAtual > 1) setPaginaAtual(paginaAtual - 1); }} 
                  className={paginaAtual === 1 ? "opacity-50 pointer-events-none" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((i) => (
                <PaginationItem key={i}>
                  <PaginationLink 
                    href="#" 
                    isActive={paginaAtual === i}
                    onClick={(e) => { e.preventDefault(); setPaginaAtual(i); }}
                    className={paginaAtual === i ? "bg-slate-900 text-white" : "cursor-pointer"}
                  >
                    {i}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); if (paginaAtual < totalPaginas) setPaginaAtual(paginaAtual + 1); }} 
                  className={paginaAtual === totalPaginas ? "opacity-50 pointer-events-none" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* MODAL CADASTRO */}
      {showModalCadastro && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '12px' }}>
          <div onClick={() => setShowModalCadastro(false)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)' }} />
          <div style={{ position: 'relative', backgroundColor: 'white', width: '100%', maxWidth: '480px', borderRadius: '24px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button onClick={() => setShowModalCadastro(false)} style={{ position: 'absolute', top: '20px', right: '20px', color: '#94a3b8' }}><X size={20} /></button>
            <form onSubmit={handleSaveNovo}>
              <FieldGroup>
                <FieldSet>
                  <FieldLegend style={{ fontSize: '18px', fontWeight: 'bold' }}>Cadastrar Profissional</FieldLegend>
                  <FieldGroup style={{ marginTop: '16px' }}>
                    <Field><FieldLabel>Nome</FieldLabel><Input name="nome" required className="h-10" /></Field>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                      <Field><FieldLabel>Especialidade</FieldLabel><Input name="especialidade" required className="h-10" /></Field>
                      <Field><FieldLabel>Registro (CRM/CRP)</FieldLabel><Input name="registro" required className="h-10" /></Field>
                    </div>
                    <Field style={{ marginTop: '12px' }}><FieldLabel>Unidade / Clínica</FieldLabel><Input name="unidade" className="h-10" /></Field>
                    <Field style={{ marginTop: '12px' }}><FieldLabel>Observações</FieldLabel><Textarea name="observacoes" style={{ minHeight: '80px' }} /></Field>
                  </FieldGroup>
                </FieldSet>
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <Button type="submit" className="bg-emerald-600 flex-1 h-12 rounded-xl font-bold text-white transition-all active:scale-95">Salvar Registro</Button>
                  <Button variant="outline" type="button" onClick={() => setShowModalCadastro(false)} className="flex-1 h-12 rounded-xl">Cancelar</Button>
                </div>
              </FieldGroup>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR / DELETAR */}
{profissionalSelecionado && (
  <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '12px' }}>
    <div onClick={() => setProfissionalSelecionado(null)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)' }} />
    <div style={{ position: 'relative', backgroundColor: 'white', width: '100%', maxWidth: '480px', borderRadius: '24px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
      <button onClick={() => setProfissionalSelecionado(null)} style={{ position: 'absolute', top: '20px', right: '20px', color: '#94a3b8' }}><X size={20} /></button>
      <form onSubmit={handleUpdate}>
        <FieldGroup>
          <FieldSet>
            <FieldLegend style={{ fontSize: '18px', fontWeight: 'bold' }}>Dados do Profissional</FieldLegend>
            <FieldDescription>Edite as informações ou remova o profissional.</FieldDescription>
            <FieldGroup style={{ marginTop: '16px' }}>
              <Field><FieldLabel>Nome</FieldLabel><Input name="nome" defaultValue={profissionalSelecionado.nome} className="h-10" /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <Field><FieldLabel>Especialidade</FieldLabel><Input name="especialidade" defaultValue={profissionalSelecionado.especialidade} className="h-10" /></Field>
                <Field><FieldLabel>Registro (CRM/CRP)</FieldLabel><Input name="registro" defaultValue={profissionalSelecionado.registro} className="h-10" /></Field>
              </div>
              <Field style={{ marginTop: '12px' }}><FieldLabel>Unidade / Clínica</FieldLabel><Input name="unidade" defaultValue={profissionalSelecionado.unidade} className="h-10" /></Field>
              <Field style={{ marginTop: '12px' }}><FieldLabel>Observações</FieldLabel><Textarea name="observacoes" defaultValue={profissionalSelecionado.observacoes} style={{ minHeight: '80px' }} /></Field>
            </FieldGroup>
          </FieldSet>
          
          <FieldSeparator style={{ margin: '20px 0' }} />
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {/* BOTÃO ALTERAR (Agora à esquerda, branco com borda) */}
            <Button 
              type="submit" 
              variant="outline"
              className="flex-1 h-12 rounded-xl text-slate-600 border-slate-200 gap-2 font-semibold active:scale-95 transition-all"
            >
              <Edit3 size={18} /> Alterar
            </Button>

            {/* BOTÃO DELETAR (Agora à direita, vermelho com letra branca) */}
            <Button 
              type="button" 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white flex-1 h-12 rounded-xl font-bold gap-2 active:scale-95 transition-all"
            >
              <Trash2 size={18} /> Deletar
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  </div>
)}
    </div>
  )
}