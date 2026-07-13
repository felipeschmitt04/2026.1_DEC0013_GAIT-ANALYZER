"use client";

import { useState } from "react"; 
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  // para controlar os inputs e status da tela
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // tentar entrar como usuário
  const entrarNoSistema = async (e: React.FormEvent) => {
    e.preventDefault();// evita que a página recarregue ou pisque
    setLoading(true);
    setError(null);

    try {
      //chama api
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, loginType: "normal" }),
      });

      const data = await response.json();
      //erro na api
      if (!response.ok) {
        throw new Error(data.message || "Erro ao fazer login.");
      }
      router.push("/pacientes");
    } catch (err: any) {
      setError(err.message || "E-mail ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    //centraliza na tela
    <div className="flex h-screen w-full items-center justify-center px-4 bg-slate-50/50">
      {/* formulário de autenticação */}
      <Card className="mx-auto max-w-sm shadow-xl border-slate-200 rounded-2xl">
        {/* Cabeçalho */}
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Login</CardTitle>
          <CardDescription>Digite seu e-mail abaixo para acessar sua conta</CardDescription>
        </CardHeader>
        {/* Conteúdo do card */}
        <CardContent>
          {/* Formulário responsável pelo envio dos dados */}
          <form onSubmit={entrarNoSistema} className="grid gap-4">
            
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
                {error}
              </div>
            )}
            {/* e-mail */}
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@exemplo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading} // bloqueia digitação enquanto carrega
                className="rounded-xl border-slate-200"
              />
            </div>
            {/* senha */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="rounded-xl border-slate-200"
              />
            </div>
            {/* Botão enviar */}
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl transition-all active:scale-95 disabled:opacity-70"
            >
              {loading ? "Carregando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}