"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // tenta entrar como admin
  const entrarComoAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      //chama api
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, loginType: "admin" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao fazer login administrativo.");
      }
      // só passa se for admin
      if (data.role === "admin") {
        router.push("/admin/profissionais");
      } else {
        throw new Error("Acesso restrito para administradores.");
      }
    } catch (err: any) {
      setError(err.message || "E-mail ou senha administrativos incorretos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    //centraliza na tela
    <div className="flex h-screen w-full items-center justify-center px-4">
      {/* formulário de autenticação */}
      <Card className="mx-auto max-w-sm border-emerald-100 shadow-lg rounded-2xl">
        {/* Cabeçalho */}
        <CardHeader>
          <CardTitle className="text-2xl text-emerald-800 font-bold tracking-tight">Admin Login</CardTitle>
          <CardDescription>Acesse o painel administrativo para gerenciar profissionais.</CardDescription>
        </CardHeader>
        {/* Conteúdo do card */}
        <CardContent>
          {/* Formulário responsável pelo envio dos dados */}
          <form onSubmit={entrarComoAdmin} className="grid gap-4">
            
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
                {error}
              </div>
            )}
            {/* e-mail */}
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-slate-700">Email Administrativo</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@gaitanalyzer.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="rounded-xl border-slate-200"
              />
            </div>
            {/* senha */}
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-slate-700">Senha</Label>
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
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl transition-all active:scale-95"
            >
              {loading ? "Carregando Painel..." : "Entrar no Painel"}
            </Button>
            {/* Separador */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Ou</span>
              </div>
            </div>
            {/* Botão  retornar login profissional */}
            <Button 
              variant="outline" 
              className="w-full h-11 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50" 
              onClick={() => router.push("/login")}
              type="button"
              disabled={loading}
            >
              Voltar para Login Profissional
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}