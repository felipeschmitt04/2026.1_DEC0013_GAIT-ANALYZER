"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, ShieldCheck, LogOut, X, Key, Mail, Stethoscope, IdCard, Edit3, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePaciente } from "@/app/PacienteContext";

// 🌟 Mesma função utilitária usada na página de pacientes, para ler cookies
function getCookie(nome: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(^| )${nome}=([^;]+)`))
  return match ? match[2] : null
}

interface Profissional {
  id: string;
  nome: string;
  especialidade: string;
  registro: string;
  observacoes?: string | null;
  email: string;
  senha: string;
}

export default function ConfiguracoesPage() {
  const router = useRouter();
  const { setPacienteAtivo, setAnaliseAtiva } = usePaciente();

  const [role, setRole] = useState<string | null>(null);

  // 🌟 NOVO: dados reais do profissional logado, vindos da API
  const [perfil, setPerfil] = useState<Profissional | null>(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [modoEdicaoPerfil, setModoEdicaoPerfil] = useState(false);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  // 🌟 NOVO: campos do formulário de edição do perfil
  const [formNome, setFormNome] = useState("");
  const [formEspecialidade, setFormEspecialidade] = useState("");
  const [formRegistro, setFormRegistro] = useState("");
  const [formObservacoes, setFormObservacoes] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formSenha, setFormSenha] = useState("");

  // Controle de Modais (mantidos, mas não usados mais para email/senha do profissional)
  const [modalEmail, setModalEmail] = useState(false);
  const [modalSenha, setModalSenha] = useState(false);
  const [email, setEmail] = useState("usuario@exemplo.com");
  const [novoEmail, setNovoEmail] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");

  useEffect(() => {
    setRole(getCookie("user-role"));
  }, []);

  // 🌟 NOVO: assim que soubermos a role, se for profissional, busca o perfil dele
  useEffect(() => {
    if (role === null) return; // ainda não leu o cookie

    if (role === "admin") {
      setCarregandoPerfil(false);
      return;
    }

    const userId = getCookie("user-id");
    if (!userId) {
      setCarregandoPerfil(false);
      return;
    }

    fetch("/api/profissionais")
      .then((res) => res.json())
      .then((lista: Profissional[]) => {
        const meuPerfil = lista.find((p) => p.id === userId) || null;
        setPerfil(meuPerfil);
        if (meuPerfil) {
          setFormNome(meuPerfil.nome);
          setFormEspecialidade(meuPerfil.especialidade);
          setFormRegistro(meuPerfil.registro);
          setFormObservacoes(meuPerfil.observacoes || "");
          setFormEmail(meuPerfil.email);
          setFormSenha(meuPerfil.senha);
        }
      })
      .catch((err) => console.error("Erro ao carregar perfil:", err))
      .finally(() => setCarregandoPerfil(false));
  }, [role]);

  // 1. AÇÃO DE LOGOUT
  const handleLogout = () => {
    if (!confirm("Deseja realmente sair?")) return;
    setPacienteAtivo(null);
    setAnaliseAtiva(null);
    localStorage.removeItem("paciente_selecionado");
    document.cookie = "user-role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "user-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"; // 🌟 NOVO: limpa também o user-id
    router.push("/login");
  };

  // 🌟 NOVO: salva as alterações do perfil chamando o PUT que já existe em /api/profissionais
  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perfil) return;

    setSalvandoPerfil(true);
    try {
      const response = await fetch("/api/profissionais", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: perfil.id,
          nome: formNome,
          especialidade: formEspecialidade,
          registro: formRegistro,
          email: formEmail,
          senha: formSenha,
          observacoes: formObservacoes,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erro ao salvar perfil.");

      setPerfil(data);
      setModoEdicaoPerfil(false);
      alert("Perfil atualizado com sucesso!");
    } catch (err: any) {
      alert(err.message || "Não foi possível salvar as alterações.");
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const cancelarEdicaoPerfil = () => {
    if (!perfil) return;
    setFormNome(perfil.nome);
    setFormEspecialidade(perfil.especialidade);
    setFormRegistro(perfil.registro);
    setFormObservacoes(perfil.observacoes || "");
    setFormEmail(perfil.email);
    setFormSenha(perfil.senha);
    setModoEdicaoPerfil(false);
  };

  if (role === null || carregandoPerfil) {
    return null;
  }

  return (
    <div className="p-10 max-w-4xl mx-auto w-full grid gap-6">

      {/* 🌟 NOVO: Card de Perfil — só aparece para profissionais (não-admin) */}
      {role !== "admin" && perfil && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <User size={18} className="text-emerald-600" /> Meu Perfil
            </div>
            {!modoEdicaoPerfil && (
              <Button variant="outline" onClick={() => setModoEdicaoPerfil(true)} className="rounded-xl border-slate-200 flex items-center gap-2">
                <Edit3 size={14} /> Editar
              </Button>
            )}
          </div>

          {modoEdicaoPerfil ? (
            <form onSubmit={handleSalvarPerfil} className="grid gap-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label className="text-slate-600">Nome</Label>
                  <Input value={formNome} onChange={(e) => setFormNome(e.target.value)} required disabled={salvandoPerfil} className="rounded-xl h-11" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-slate-600">Especialidade</Label>
                  <Input value={formEspecialidade} onChange={(e) => setFormEspecialidade(e.target.value)} required disabled={salvandoPerfil} className="rounded-xl h-11" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label className="text-slate-600">Registro (CRM/CRP/CREFITO...)</Label>
                  <Input value={formRegistro} onChange={(e) => setFormRegistro(e.target.value)} required disabled={salvandoPerfil} className="rounded-xl h-11" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-slate-600">Email</Label>
                  <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required disabled={salvandoPerfil} className="rounded-xl h-11" />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-slate-600">Senha</Label>
                <Input type="text" value={formSenha} onChange={(e) => setFormSenha(e.target.value)} required disabled={salvandoPerfil} className="rounded-xl h-11" placeholder="Digite a nova senha" />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-slate-600">Observações</Label>
                <Textarea value={formObservacoes} onChange={(e) => setFormObservacoes(e.target.value)} disabled={salvandoPerfil} className="rounded-xl" />
              </div>

              <div className="flex gap-3 mt-1">
                <Button type="submit" disabled={salvandoPerfil} className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white flex-1 h-11 rounded-xl flex items-center justify-center gap-2">
                  <Save size={16} /> {salvandoPerfil ? "Salvando..." : "Salvar Alterações"}
                </Button>
                <Button type="button" variant="outline" disabled={salvandoPerfil} onClick={cancelarEdicaoPerfil} className="flex-1 h-11 rounded-xl">
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Nome</p>
                  <p className="text-sm text-slate-900 font-normal m-0">{perfil.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Stethoscope size={12} /> Especialidade
                  </p>
                  <p className="text-sm text-slate-900 font-normal m-0">{perfil.especialidade}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <IdCard size={12} /> Registro
                  </p>
                  <p className="text-sm text-slate-900 font-normal m-0">{perfil.registro}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Mail size={12} /> Email
                  </p>
                  <p className="text-sm text-slate-900 font-normal m-0">{perfil.email}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <Key size={12} /> Senha
                </p>
                <p className="text-sm text-slate-900 font-normal m-0">{"•".repeat(perfil.senha.length)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Opção: Encerrar Sessão — aparece sempre, para admin e profissional */}
      <div className="bg-red-50/40 border border-red-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-bold text-red-900 mb-1">
            <LogOut size={18} /> Encerrar Sessão
          </div>
          <p className="text-red-700/80 text-xs m-0">Isso fechará seu acesso imediato ao painel clínico.</p>
        </div>
        <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold h-11 px-6 rounded-xl flex items-center gap-2 shadow-md w-full sm:w-auto">
          Sair do Sistema
        </Button>
      </div>

    </div>
  );
}