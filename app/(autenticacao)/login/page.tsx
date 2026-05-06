"use client";

import { useEffect } from "react"; 
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()

  // Limpa os cookies de autenticação e cargo ao entrar na tela de login
  useEffect(() => {
    document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "user-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }, []);

  const entrarNoSistema = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Define o cookie de autenticação padrão (profissional comum)
    document.cookie = "auth-token=true; path=/; SameSite=Lax";

    router.push("/pacientes");
  };

  return (
    <div className="flex h-screen w-full items-center justify-center px-4 bg-slate-50/50">
      <Card className="mx-auto max-w-sm shadow-xl border-slate-200 rounded-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Login</CardTitle>
          <CardDescription>
            Digite seu e-mail abaixo para acessar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={entrarNoSistema} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@exemplo.com"
                required
                className="rounded-xl border-slate-200"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                {/* Link atualizado para a nova rota de esqueci-senha */}
                <Link 
                  href="/esqueci-senha" 
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 underline-offset-4 hover:underline"
                >
                  Esqueceu sua senha?
                </Link>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                className="rounded-xl border-slate-200"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl transition-all active:scale-95"
            >
              Entrar
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-11 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50" 
              onClick={() => entrarNoSistema()}
              type="button"
            >
              Entrar com Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}