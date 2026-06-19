"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronLeft, Mail, CheckCircle2 } from "lucide-react";

export default function EsqueciSenhaPage() {
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEnviado(true);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center px-4 bg-slate-50/50">
      <Card className="mx-auto max-w-sm shadow-xl border-slate-200 rounded-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Link 
              href="/login" 
              className="text-slate-400 hover:text-emerald-600 transition-colors"
            >
              <ChevronLeft size={20} />
            </Link>
            <CardTitle className="text-2xl font-bold tracking-tight">Recuperar senha</CardTitle>
          </div>
          <CardDescription>
            {!enviado 
              ? "Digite seu e-mail para receber as instruções de redefinição." 
              : "Verifique sua caixa de entrada para prosseguir."}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {!enviado ? (
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-slate-700">E-mail cadastrado</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@exemplo.com"
                  required
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl transition-all active:scale-95"
              >
                Enviar link de recuperação
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center text-center py-4 animate-in fade-in zoom-in duration-300">
              <div className="bg-emerald-50 p-4 rounded-full mb-4">
                <Mail className="text-emerald-600 size-10" />
              </div>
              <p className="text-sm text-slate-600 mb-6">
                Enviamos um link de recuperação para o e-mail informado. Não esqueça de verificar a caixa de spam.
              </p>
              <Button 
                asChild
                variant="outline"
                className="w-full h-11 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                <Link href="/login">Voltar ao Login</Link>
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link 
              href="/login" 
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Lembrou a senha? Clique aqui para entrar
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}