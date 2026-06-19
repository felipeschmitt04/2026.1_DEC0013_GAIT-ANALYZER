"use client"

import { useState, useEffect } from "react"
import { Plus, X, User, Search, Briefcase, IdCard, Lock, Trash2, Edit3, Save, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface Profissional {
  id: string; 
  nome: string;
  especialidade: string;
  registro: string;
  email: string; 
  senha?: string;
  observacoes?: string;
}

export default function ProfissionaisPage() {
  const [showModalCadastro, setShowModalCadastro] = useState(false)
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<Profissional | null>(null)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  
  const [busca, setBusca] = useState("")
  const [paginaAtual, setPaginaAtual] = useState(1)
  const itensPorPagina = 3

  const [formNome, setFormNome] = useState("")
  const [formEspecialidade, setFormEspecialidade] = useState("")
  const [formRegistro, setFormRegistro] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formSenha, setFormSenha] = useState("")
  const [formObservacoes, setFormObservacoes] = useState("")

  useEffect(() => {
    carregarProfissionais();
  }, []);

  useEffect(() => {
    if (profissionalSelecionado && modoEdicao) {
      setFormNome(profissionalSelecionado.nome)
      setFormEspecialidade(profissionalSelecionado.especialidade)
      setFormRegistro(profissionalSelecionado.registro)
      setFormEmail(profissionalSelecionado.email)
      setFormSenha(profissionalSelecionado.senha || "admin123")
      setFormObservacoes(profissionalSelecionado.observacoes || "")
    } else if (!showModalCadastro) {
      setFormNome("")
      setFormEspecialidade("")
      setFormRegistro("")
      setFormEmail("")
      setFormSenha("")
      setFormObservacoes("")
    }
  }, [profissionalSelecionado, modoEdicao, showModalCadastro]);

  const carregarProfissionais = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/profissionais");
      if (res.ok) {
        const dados = await res.json();
        setProfissionais(dados);
      }
    } catch (err) {
      console.error("Erro ao carregar profissionais:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtrados = profissionais.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  )

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

  const handleNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const apenasLetras = e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, "");
    setFormNome(apenasLetras);
  }

  const handleEspecialidadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const apenasLetras = e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, "");
    setFormEspecialidade(apenasLetras);
  }

  const handleSaveNovo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSalvando(true)
    
    const dadosForm = {
      nome: formNome.trim(),
      especialidade: formEspecialidade.trim(),
      registro: formRegistro.trim(),
      email: formEmail.trim().toLowerCase(),
      senha: formSenha,
      role: "profissional",
      observacoes: formObservacoes.trim() || null,
    }

    try {
      const response = await fetch("/api/profissionais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Erro ao criar credenciais.");
      }

      carregarProfissionais() 
      setShowModalCadastro(false)
      alert(`Profissional cadastrado! Acesso liberado.`);
    } catch (err: any) {
      alert(err.message || "Não foi possível cadastrar o profissional.");
    } finally {
      setSalvando(false)
    }
  }

  const handleUpdateProfissional = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!profissionalSelecionado) return

    setSalvando(true)

    const dadosAtualizados = {
      id: profissionalSelecionado.id,
      nome: formNome.trim(),
      especialidade: formEspecialidade.trim(),
      registro: formRegistro.trim(),
      email: formEmail.trim().toLowerCase(),
      senha: formSenha,
      observacoes: formObservacoes.trim() || null,
    }

    try {
      const response = await fetch("/api/profissionais", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosAtualizados),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Erro ao atualizar dados.");
      }

      alert("Dados updated com sucesso!")
      setModoEdicao(false)
      setProfissionalSelecionado(null)
      carregarProfissionais()
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar profissional.");
    } finally {
      setSalvando(false)
    }
  }

  const handleDesativarProfissional = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza de que deseja remover o acesso de ${nome}? Ele não poderá mais fazer login.`)) {
      return
    }

    try {
      const response = await fetch("/api/profissionais", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Erro ao desativar.");

      alert("Profissional desativado com sucesso!")
      setProfissionalSelecionado(null)
      carregarProfissionais()
    } catch (err) {
      alert("Não foi possível desativar este profissional.")
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
      {loading ? (
        <div className="py-20 text-center text-slate-500 font-medium animate-pulse">Carregando dados dos profissionais...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {exibidos.length > 0 ? (
            exibidos.map((p) => (
              <div 
                key={p.id} 
                onClick={() => { setProfissionalSelecionado(p); setModoEdicao(false); }}
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
              Nenhum profissional encontrado no banco.
            </div>
          )}
        </div>
      )}

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
                    className={paginaAtual === i ? "bg-slate-950 hover:bg-slate-900 text-white font-medium" : "cursor-pointer"}
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
          <div onClick={() => !salvando && setShowModalCadastro(false)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)' }} />
          <div style={{ position: 'relative', backgroundColor: 'white', width: '100%', maxWidth: '460px', borderRadius: '24px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button type="button" disabled={salvando} onClick={() => setShowModalCadastro(false)} style={{ position: 'absolute', top: '20px', right: '20px', color: '#94a3b8' }}><X size={20} /></button>
            <form onSubmit={handleSaveNovo}>
              <div className="grid gap-4 text-left">
                <h3 className="text-xl font-bold text-slate-950">Cadastrar Profissional</h3>
                
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Nome Completo</label>
                  <Input name="nome" value={formNome} onChange={handleNomeChange} required disabled={salvando} className="h-11 rounded-xl" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Especialidade</label>
                    <Input name="especialidade" value={formEspecialidade} onChange={handleEspecialidadeChange} required disabled={salvando} className="h-11 rounded-xl" />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Registro Profissional</label>
                    <Input name="registro" value={formRegistro} onChange={(e) => setFormRegistro(e.target.value)} required disabled={salvando} className="h-11 rounded-xl" placeholder="CRM/CREFITO" />
                  </div>
                </div>

                <div className="border-t pt-2 mt-2">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1 mb-3">
                    <Lock size={12} /> Configuração de Credenciais
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <label className="text-sm font-medium text-slate-700">E-mail de Login</label>
                      <Input name="email" type="email" placeholder="medico@email.com" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required disabled={salvando} className="h-11 rounded-xl" />
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-sm font-medium text-slate-700">Senha Provisória</label>
                      <Input name="password" type="text" placeholder="Senha123" value={formSenha} onChange={(e) => setFormSenha(e.target.value)} required disabled={salvando} className="h-11 rounded-xl" />
                    </div>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Observações</label>
                  <Textarea name="observacoes" value={formObservacoes} onChange={(e) => setFormObservacoes(e.target.value)} disabled={salvando} style={{ minHeight: '60px' }} className="rounded-xl" />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <Button type="submit" disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700 flex-1 h-12 rounded-xl font-bold text-white transition-all active:scale-95 disabled:opacity-50">
                    {salvando ? "Gravando na Nuvem..." : "Confirmar Cadastro"}
                  </Button>
                  <Button variant="outline" type="button" disabled={salvando} onClick={() => setShowModalCadastro(false)} className="flex-1 h-12 rounded-xl">Cancelar</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES (FICHA / ALTERAÇÃO) */}
      {profissionalSelecionado && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '12px' }}>
          <div onClick={() => !salvando && setProfissionalSelecionado(null)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)' }} />
          <div style={{ position: 'relative', backgroundColor: 'white', width: '100%', maxWidth: '440px', borderRadius: '24px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button type="button" disabled={salvando} onClick={() => setProfissionalSelecionado(null)} style={{ position: 'absolute', top: '20px', right: '20px', color: '#94a3b8' }}><X size={20} /></button>
            
            <form onSubmit={handleUpdateProfissional}>
              <div className="grid gap-4 text-left">
                <div className="flex items-center gap-2">
                  {modoEdicao && (
                    <button type="button" onClick={() => setModoEdicao(false)} className="text-slate-500 hover:text-slate-700 mr-1">
                      <ArrowLeft size={18} />
                    </button>
                  )}
                  <h3 className="text-xl font-bold text-slate-950">
                    {modoEdicao ? "Alterar Dados" : "Ficha do Profissional"}
                  </h3>
                </div>
                
                {/* CAMPO NOME */}
                <div className="border-b pb-2">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Nome</p>
                  {modoEdicao ? (
                    <Input name="nome" value={formNome} onChange={handleNomeChange} required disabled={salvando} className="h-10 rounded-xl font-normal text-sm text-slate-900" />
                  ) : (
                    <p style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }} className="text-sm font-normal text-slate-900 m-0">
                      {profissionalSelecionado.nome}
                    </p>
                  )}
                </div>

                {/* GRID ESPECIALIDADE E REGISTRO */}
                <div className="grid grid-cols-2 gap-3 border-b pb-2">
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Especialidade</p>
                    {modoEdicao ? (
                      <Input name="especialidade" value={formEspecialidade} onChange={handleEspecialidadeChange} required disabled={salvando} className="h-10 rounded-xl font-normal text-sm text-slate-900" />
                    ) : (
                      <p style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }} className="text-sm text-slate-900 font-normal m-0">
                        {profissionalSelecionado.especialidade}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Registro</p>
                    {modoEdicao ? (
                      <Input name="registro" value={formRegistro} onChange={(e) => setFormRegistro(e.target.value)} required disabled={salvando} className="h-10 rounded-xl font-normal text-sm text-slate-900" />
                    ) : (
                      <p style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }} className="text-sm text-slate-900 font-normal m-0">
                        {profissionalSelecionado.registro}
                      </p>
                    )}
                  </div>
                </div>

                {/* SEÇÃO DE CREDENCIAIS */}
                <div className="grid grid-cols-2 gap-3 border-b pb-2">
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">E-mail</p>
                    {modoEdicao ? (
                      <Input name="email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required disabled={salvando} className="h-10 rounded-xl font-normal text-sm text-slate-900" />
                    ) : (
                      <p style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }} className="text-sm text-slate-900 font-normal m-0">
                        {profissionalSelecionado.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Senha de Acesso</p>
                    {modoEdicao ? (
                      <Input name="password" type="text" value={formSenha} onChange={(e) => setFormSenha(e.target.value)} required disabled={salvando} className="h-10 rounded-xl font-normal text-sm text-slate-900" />
                    ) : (
                      <p className="text-sm text-slate-900 font-normal m-0">••••••••</p>
                    )}
                  </div>
                </div>

                {/* CAMPO OBSERVAÇÕES */}
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Observações Internas</p>
                  {modoEdicao ? (
                    <Textarea name="observacoes" value={formObservacoes} onChange={(e) => setFormObservacoes(e.target.value)} disabled={salvando} style={{ minHeight: '60px' }} className="rounded-xl font-normal text-sm text-slate-900" />
                  ) : (
                    <div className="w-full bg-slate-50/50 p-3 rounded-xl border border-slate-200/60 mt-1 min-h-[50px]">
                      <p style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }} className="text-sm font-normal text-slate-900 m-0">
                        {profissionalSelecionado.observacoes || "Nenhuma observação registrada."}
                      </p>
                    </div>
                  )}
                </div>

                {/* BOTÕES DE AÇÃO */}
                {modoEdicao ? (
                  <Button type="submit" disabled={salvando} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl mt-2 flex items-center justify-center gap-2 transition-all active:scale-95">
                    <Save size={16} /> {salvando ? "Salvando Alterações..." : "Salvar Alterações"}
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => handleDesativarProfissional(profissionalSelecionado.id, profissionalSelecionado.nome)}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl transition-colors text-sm border border-rose-200/40 active:scale-95"
                    >
                      <Trash2 size={16} /> Apagar Profissional
                    </button>

                    <button
                      type="button"
                      onClick={() => setModoEdicao(true)}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all text-sm shadow-md active:scale-95"
                    >
                      <Edit3 size={16} /> Alterar Dados
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}