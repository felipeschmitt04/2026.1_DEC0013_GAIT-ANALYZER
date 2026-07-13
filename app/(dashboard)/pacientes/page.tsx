"use client"

import { useState, useEffect } from "react"
import { Plus, X, User, Search, IdCard, Trash2, Edit3, Save, ArrowLeft, Calendar, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { usePaciente } from "@/app/PacienteContext"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface Paciente {
  id: string;
  nome: string;
  cpf: string;
  dataNascimento: string;
  genero?: string | null;
  peso?: number | null;
  altura?: number | null;
  telefone?: string | null;
  observacoes?: string | null;
  profissionalId: string;
}

//calcula a idade do paciente com base na data de nascimento
function calcularIdade(dataNasc: string): string {
  try {
    if (!dataNasc) return "—"
    const hoje = new Date()
    const nasc = new Date(dataNasc)
    if (isNaN(nasc.getTime())) return "—"

    let idade = hoje.getFullYear() - nasc.getFullYear()
    const m = hoje.getMonth() - nasc.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
      idade--
    }
    return `${idade} anos`
  } catch {
    return "—"
  }
}

//pega o valor de um cookie salvo no navegador
function getCookie(nome: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(^| )${nome}=([^;]+)`))
  return match ? match[2] : null
}

export default function PacientesPage() {

  //estados e controles da tela
  const { pacienteAtivo, setPacienteAtivo, setAnaliseAtiva, setJobIdAtivo } = usePaciente()

  const [showModalCadastro, setShowModalCadastro] = useState(false)
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  //controle do tipo de usuário logado
  const [role, setRole] = useState<string | null>(null)

  //id temporário do profissional responsável
  const profesionalIdLogado = "id-do-profissional-temporario"

  //estados para a busca e a paginação
  const [busca, setBusca] = useState("")
  const [paginaAtual, setPaginaAtual] = useState(1)
  const itensPorPagina = 12

  //estados para os campos do formulário
  const [formNome, setFormNome] = useState("")
  const [formCpf, setFormCpf] = useState("")
  const [formTelefone, setFormTelefone] = useState("")

  const [selectGeneroCadastro, setSelectGeneroCadastro] = useState("")
  const [selectGeneroEdicao, setSelectGeneroEdicao] = useState("")

  //carrega imediatamente a listagem e identifica o usuário logado
  useEffect(() => {
    carregarPacientes();
    setRole(getCookie("user-role"));
  }, []);

  //monitora a tela a todo instante
  useEffect(() => {
    //altera os dados conforme o paciente selecionado
    if (pacienteSelecionado && modoEdicao) {
      setFormNome(pacienteSelecionado.nome)
      setFormCpf(pacienteSelecionado.cpf)
      setFormTelefone(pacienteSelecionado.telefone || "")
      setSelectGeneroEdicao(pacienteSelecionado.genero || "")
    } else if (!showModalCadastro) {
      //reseta tudo quando fecha, para não restar nada do paciente passado
      setFormNome("")
      setFormCpf("")
      setFormTelefone("")
      setSelectGeneroCadastro("")
    }
  }, [pacienteSelecionado, modoEdicao, showModalCadastro]);

  //api
  //traz a lista do banco
  const carregarPacientes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pacientes");
      if (res.ok) {
        const dados = await res.json();
        setPacientes(dados);
      }
    } catch (err) {
      console.error("Erro ao carregar pacientes:", err);
    } finally {
      setLoading(false);
    }
  };

  //filtra a lista com base no que foi digitado
  const filtrados = pacientes.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  )

  //organiza a lista em ordem alfabética
  const ordenados = [...filtrados].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  )

  //calcula a paginação, pra deixar de 3 em 3
  const totalPaginas = Math.ceil(ordenados.length / itensPorPagina)
  const indiceUltimo = paginaAtual * itensPorPagina
  const indicePrimeiro = indiceUltimo - itensPorPagina
  const exibidos = ordenados.slice(indicePrimeiro, indiceUltimo)

  //pega a busca que fez de usuário e joga para a página 1
  const handleBusca = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusca(e.target.value)
    setPaginaAtual(1)
  }

  //impede números e símbolos no nome
  const handleNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const apenasLetras = e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, "");
    setFormNome(apenasLetras);
  }

  //permite apenas números no cpf
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const apenasNumeros = e.target.value.replace(/\D/g, "");
    setFormCpf(apenasNumeros);
  }

  //permite apenas números no telefone
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const apenasNumeros = e.target.value.replace(/\D/g, "");
    setFormTelefone(apenasNumeros);
  }

  //impede caracteres inválidos nos campos numéricos
  const handleBlockInvalidChars = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "-", "+"].includes(e.key)) {
      e.preventDefault();
    }
  }

  //seleciona o paciente para iniciar uma análise
  const handleSelectPatientAction = (paciente: Paciente) => {
    //limpa a análise anterior antes de selecionar outro paciente
    setAnaliseAtiva(null)
    setJobIdAtivo(null)

    setPacienteAtivo({
      id: paciente.id,
      nome: paciente.nome
    })

    setPacienteSelecionado(null)
  }

  //cadastrar paciente
  const handleSaveNovo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    if (formCpf.length !== 11) {
      alert("O CPF deve conter exatamente 11 números.");
      return;
    }

    if (formTelefone.length < 10) {
      alert("Insira um número de telefone válido com DDD (mínimo 10 dígitos).");
      return;
    }

    setSalvando(true)
    const dadosForm = {
      nome: formNome.trim(),
      cpf: formCpf,
      dataNascimento: formData.get("dataNascimento") as string,
      genero: selectGeneroCadastro,
      peso: parseFloat(formData.get("peso") as string),
      altura: parseFloat(formData.get("altura") as string),
      telefone: formTelefone,
      observacoes: (formData.get("observacoes") as string) || null,
      profissionalId: profesionalIdLogado
    }

    //manda api
    try {
      const response = await fetch("/api/pacientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosForm),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Erro ao cadastrar paciente.");

      carregarPacientes() //agora atualizada com o novo paciente
      setShowModalCadastro(false)
      alert(`Paciente cadastrado com sucesso!`);
    } catch (err: any) {
      alert(err.message || "Não foi possível cadastrar o paciente.");
    } finally {
      setSalvando(false)
    }
  }

    //alterar paciente
  const handleUpdatePaciente = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!pacienteSelecionado) return

    if (formCpf.length !== 11) {
      alert("O CPF deve conter exatamente 11 números.");
      return;
    }

    if (formTelefone.length < 10) {
      alert("Insira um número de telefone válido com DDD (mínimo 10 dígitos).");
      return;
    }

    const formData = new FormData(e.currentTarget)
    setSalvando(true)

    const dadosAtualizados = {
      id: pacienteSelecionado.id,
      nome: formNome.trim(),
      cpf: formCpf,
      dataNascimento: formData.get("dataNascimento") as string,
      genero: selectGeneroEdicao,
      peso: parseFloat(formData.get("peso") as string),
      altura: parseFloat(formData.get("altura") as string),
      telefone: formTelefone,
      observacoes: (formData.get("observacoes") as string) || null,
    }

    //manda api
    try {
      const response = await fetch("/api/pacientes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosAtualizados),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Erro ao atualizar dados.");
      }

      alert("Dados do paciente atualizados!")
      setModoEdicao(false)
      setPacienteSelecionado(null)
      carregarPacientes()
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar paciente.");
    } finally {
      setSalvando(false)
    }
  }

  //deletar paciente
  const handleDesativarPaciente = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza de que deseja remover o cadastro de ${nome}?`)) return

    //manda api
    try {
      const response = await fetch("/api/pacientes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Erro ao desativar.");

      //se o paciente removido estiver selecionado, limpa a análise atual
      if (pacienteAtivo?.id === id) {
        setPacienteAtivo(null)
        setAnaliseAtiva(null)
        setJobIdAtivo(null)
      }

      alert("Paciente desativado com sucesso!")
      setPacienteSelecionado(null)
      carregarPacientes()
    } catch (err) {
      alert("Não foi possível desativar este paciente.")
    }
  }

  //limita a data de nascimento até o dia atual
  const hojeString = new Date().toISOString().split("T")[0];

  return (
    //container geral
    <div style={{ padding: '24px', position: 'relative' }}>
        {/* cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', gap: '12px' }}>
        {/* Título e descrição da página */}
        <div style={{ flex: '0 0 auto' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: '#0f172a', margin: 0, lineHeight: '1.2' }}>Pacientes</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Gerencie as fichas clínicas e dados antropométricos dos pacientes.</p>
        </div>
         {/* campo de pesquisa*/}
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
        {/* Botão cadastro */}
        <Button onClick={() => setShowModalCadastro(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg transition-all active:scale-95 font-semibold h-[48px] px-6">
          <Plus className="size-5 mr-2" /> Novo Paciente
        </Button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500 font-medium animate-pulse">Carregando dados dos pacientes...</div>
      ) : (
        // lista pacientes
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {exibidos.length > 0 ? (
            exibidos.map((p) => (
              <div 
                key={p.id} 
                // ao clicar no card abre a ficha do paciente
                onClick={() => { setPacienteSelecionado(p); setModoEdicao(false); }}
                style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s', cursor: 'pointer' }} 
                className="hover:border-zinc-400 hover:shadow-md active:scale-95"
              >
                {/* Ícone do paciente */}
                <div style={{ backgroundColor: '#f8fafc', minWidth: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={22} className="text-slate-600" />
                </div>
                {/* informações do paciente */}
                <div style={{ overflow: 'hidden' }}>
                  <h3 style={{ fontWeight: 'bold', color: '#1e293b', margin: 0, fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</h3>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}><IdCard size={12} /> {p.cpf}</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {calcularIdade(p.dataNascimento)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center text-slate-400">
              Nenum paciente encontrado no banco.
            </div>
          )}
        </div>
      )}

      {/* paginação */}
      {totalPaginas > 1 && (
        <div style={{ marginTop: '32px' }}>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                {/* Página anterior */}
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); if (paginaAtual > 1) setPaginaAtual(paginaAtual - 1); }} 
                  className={paginaAtual === 1 ? "opacity-50 pointer-events-none" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {/* Numeração das páginas */}
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((i) => (
                <PaginationItem key={i}>
                  <PaginationLink 
                    href="#" 
                    isActive={paginaAtual === i}
                    onClick={(e) => { e.preventDefault(); setPaginaAtual(i); }}
                    className={paginaAtual === i 
                      ? "bg-black hover:bg-zinc-800 text-white" 
                      : "cursor-pointer"}
                  >
                    {i}
                  </PaginationLink>
                </PaginationItem>
              ))}

              {/* Próxima página */}
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

      {/* modal de cadastro */}
      {showModalCadastro && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          {/* Fundo escurecido */}
          <div onClick={() => !salvando && setShowModalCadastro(false)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)' }} />
          {/* Janela do modal */}
          <div style={{ position: 'relative', backgroundColor: 'white', width: '100%', maxWidth: '480px', maxHeight: '85vh', borderRadius: '24px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' }}>
             {/* Botão para fechar */}
            <button type="button" disabled={salvando} onClick={() => setShowModalCadastro(false)} style={{ position: 'absolute', top: '24px', right: '24px', color: '#94a3b8', zIndex: 10 }}><X size={20} /></button>
            {/* Título */}
            <h3 className="text-xl font-bold text-slate-950 mb-4 flex-shrink-0">Cadastrar Paciente</h3>
            
            <div style={{ overflowY: 'auto', paddingRight: '4px' }} className="flex-1 pr-1 grid gap-4 text-left custom-scrollbar">
               {/* Formulário de cadastro */}
              <form onSubmit={handleSaveNovo} className="grid gap-4">
                
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Nome Completo</label>
                  <Input name="nome" value={formNome} onChange={handleNomeChange} required disabled={salvando} className="h-11 rounded-xl" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium text-slate-700">CPF</label>
                    <Input name="cpf" value={formCpf} onChange={handleCpfChange} required disabled={salvando} maxLength={11} className="h-11 rounded-xl" placeholder="11 dígitos" />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Data de Nascimento</label>
                    <Input name="dataNascimento" type="date" max={hojeString} required disabled={salvando} className="h-11 rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Gênero</label>
                    <select 
                      name="genero" 
                      value={selectGeneroCadastro}
                      onChange={(e) => setSelectGeneroCadastro(e.target.value)}
                      required 
                      disabled={salvando} 
                      style={{ color: selectGeneroCadastro === "" ? "#94a3b8" : "#0f172a" }}
                      className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-normal"
                    >
                      <option value="" style={{ color: "#94a3b8" }}>Selecione...</option>
                      <option value="Masculino" style={{ color: "#0f172a" }}>Masculino</option>
                      <option value="Feminino" style={{ color: "#0f172a" }}>Feminino</option>
                      <option value="Outro" style={{ color: "#0f172a" }}>Outro</option>
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Peso (kg)</label>
                    <Input name="peso" type="number" step="0.1" min="0" onKeyDown={handleBlockInvalidChars} disabled={salvando} className="h-11 rounded-xl" placeholder="0.0" />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Altura (m)</label>
                    <Input name="altura" type="number" step="0.01" min="0" onKeyDown={handleBlockInvalidChars} disabled={salvando} className="h-11 rounded-xl" placeholder="1.75" />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Telefone / Contato</label>
                  <Input name="telefone" value={formTelefone} onChange={handleTelefoneChange} required minLength={10} disabled={salvando} className="h-11 rounded-xl" placeholder="(00) 00000-0000" />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Observações Clínicas</label>
                  <Textarea name="observacoes" disabled={salvando} style={{ minHeight: '80px' }} className="rounded-xl" />
                </div>

                {/* Botões de confirmar e cancelar */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', marginBottom: '4px' }}>
                  <Button type="submit" disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700 flex-1 h-12 rounded-xl font-bold text-white transition-all active:scale-95">
                    {salvando ? "Gravando na Nuvem..." : "Confirmar Cadastro"}
                  </Button>
                  <Button variant="outline" type="button" disabled={salvando} onClick={() => setShowModalCadastro(false)} className="flex-1 h-12 rounded-xl">Cancelar</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Modal paciente selecionado */}
      {pacienteSelecionado && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          {/* Fundo escurecido */}
          <div onClick={() => !salvando && setPacienteSelecionado(null)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)' }} />
          {/* Conteúdo da ficha */}
          <div style={{ position: 'relative', backgroundColor: 'white', width: '100%', maxWidth: '480px', maxHeight: '85vh', borderRadius: '24px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' }}>
            {/* Botão fechar */}
            <button type="button" disabled={salvando} onClick={() => setPacienteSelecionado(null)} style={{ position: 'absolute', top: '24px', right: '24px', color: '#94a3b8', zIndex: 10 }}><X size={20} /></button>
            {/* Cabeçalho da ficha */}
            <div className="flex items-center gap-2 mb-4 flex-shrink-0">
              {/* Voltar caso esteja editando */}
              {modoEdicao && (
                <button type="button" onClick={() => setModoEdicao(false)} className="text-slate-500 hover:text-slate-700 mr-1">
                  <ArrowLeft size={18} />
                </button>
              )}
              <h3 className="text-xl font-bold text-slate-950">
                {modoEdicao ? "Alterar Dados" : "Ficha do Paciente"}
              </h3>
            </div>
            
            <div style={{ overflowY: 'auto', paddingRight: '4px' }} className="flex-1 pr-1 custom-scrollbar">
              {/* Formulário para visualização e edição */}
              <form onSubmit={handleUpdatePaciente} className="grid gap-4 text-left">
                
                <div className="border-b pb-2">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Nome</p>
                  {modoEdicao ? (
                    <Input name="nome" value={formNome} onChange={handleNomeChange} required disabled={salvando} className="h-10 rounded-xl font-normal text-sm text-slate-900" />
                  ) : (
                    <p style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }} className="text-sm font-normal text-slate-900 m-0">
                      {pacienteSelecionado.nome}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 border-b pb-2">
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">CPF</p>
                    {modoEdicao ? (
                      <Input name="cpf" value={formCpf} onChange={handleCpfChange} required disabled={salvando} maxLength={11} className="h-10 rounded-xl font-normal text-sm text-slate-900" placeholder="11 dígitos" />
                    ) : (
                      <p style={{ wordBreak: 'break-word' }} className="text-sm text-slate-900 font-normal m-0">{pacienteSelecionado.cpf}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Data de Nascimento</p>
                    {modoEdicao ? (
                      <Input name="dataNascimento" type="date" max={hojeString} defaultValue={pacienteSelecionado.dataNascimento} required disabled={salvando} className="h-10 rounded-xl font-normal text-sm text-slate-900" />
                    ) : (
                      <p className="text-sm text-slate-900 font-normal m-0">
                        {pacienteSelecionado.dataNascimento ? new Date(pacienteSelecionado.dataNascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 border-b pb-2">
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Gênero</p>
                    {modoEdicao ? (
                      <select 
                        name="genero" 
                        value={selectGeneroEdicao}
                        onChange={(e) => setSelectGeneroEdicao(e.target.value)} 
                        required 
                        disabled={salvando} 
                        style={{ color: selectGeneroEdicao === "" ? "#94a3b8" : "#0f172a" }}
                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none font-normal"
                      >
                        <option value="" style={{ color: "#94a3b8" }}>Selecione...</option>
                        <option value="Masculino" style={{ color: "#0f172a" }}>Masculino</option>
                        <option value="Feminino" style={{ color: "#0f172a" }}>Feminino</option>
                        <option value="Outro" style={{ color: "#0f172a" }}>Outro</option>
                      </select>
                    ) : (
                      <p className="text-sm text-slate-900 font-normal m-0">{pacienteSelecionado.genero || "—"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Peso</p>
                    {modoEdicao ? (
                      <Input name="peso" type="number" step="0.1" min="0" onKeyDown={handleBlockInvalidChars} defaultValue={pacienteSelecionado.peso || ""} disabled={salvando} className="h-10 rounded-xl font-normal text-sm text-slate-900" />
                    ) : (
                      <p className="text-sm text-slate-900 font-normal m-0">{pacienteSelecionado.peso ? `${pacienteSelecionado.peso} kg` : "—"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Altura</p>
                    {modoEdicao ? (
                      <Input name="altura" type="number" step="0.01" min="0" onKeyDown={handleBlockInvalidChars} defaultValue={pacienteSelecionado.altura || ""} disabled={salvando} className="h-10 rounded-xl font-normal text-sm text-slate-900" />
                    ) : (
                      <p className="text-sm text-slate-900 font-normal m-0">{pacienteSelecionado.altura ? `${pacienteSelecionado.altura} m` : "—"}</p>
                    )}
                  </div>
                </div>

                <div className="border-b pb-2">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Telefone / Contato</p>
                  {modoEdicao ? (
                    <Input name="telefone" value={formTelefone} onChange={handleTelefoneChange} required minLength={10} disabled={salvando} className="h-10 rounded-xl font-normal text-sm text-slate-900" />
                  ) : (
                    <p style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }} className="text-sm text-slate-900 font-normal m-0">
                      {pacienteSelecionado.telefone || "—"}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Observações Internas</p>
                  {modoEdicao ? (
                    <Textarea name="observacoes" defaultValue={pacienteSelecionado.observacoes || ""} disabled={salvando} style={{ minHeight: '80px' }} className="rounded-xl font-normal text-sm text-slate-900" />
                  ) : (
                    <div className="w-full bg-slate-50/50 p-3 rounded-xl border border-slate-200/60 min-h-[60px]">
                      <p style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }} className="text-sm font-normal text-slate-900 m-0">
                        {pacienteSelecionado.observacoes || "Nenhuma observação registrada."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-3 w-full flex-shrink-0">
                  {modoEdicao ? (
                     // Botão salvar alterações
                    <Button type="submit" disabled={salvando} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                      <Save size={16} /> {salvando ? "Salvando Alterações..." : "Salvar Alterações"}
                    </Button>
                  ) : (
                    <>
                    {/* Área de ações da ficha */}
                      <div className={role === "admin" ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"}>
                        {/* Apenas administradores podem remover pacientes */}
                        {role === "admin" && (
                          <button
                            type="button"
                            onClick={() => handleDesativarPaciente(pacienteSelecionado.id, pacienteSelecionado.nome)}
                            className="flex items-center justify-center gap-2 px-3 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl transition-colors text-sm border border-rose-200/40"
                          >
                            <Trash2 size={16} /> Apagar Paciente
                          </button>
                        )}
                        {/* Habilita o modo de edição */}
                        <button
                          type="button"
                          onClick={() => setModoEdicao(true)}
                          className="flex items-center justify-center gap-2 px-3 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold rounded-xl text-sm"
                        >
                          <Edit3 size={16} /> Alterar Dados
                        </button>
                      </div>
                      {/* Define paciente como paciente ativo */}
                      <Button
                        type="button"
                        onClick={() => handleSelectPatientAction(pacienteSelecionado)}
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                      >
                        <CheckCircle size={18} /> Selecionar Paciente para Análise
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}