import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PacienteProvider } from "./PacienteContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
// fica na aba lá em cima, descrição é bastidor de código
export const metadata: Metadata = {
  title: "Gait Analyzer | Projeto PI",
  description: "Sistema de análise de marcha 3D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // o envelopamento do código, tooltipprovider é os balões do shadcn/ui, PacienteProvide é a memória global
    <html lang="pt-br" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-background">
        <PacienteProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </PacienteProvider>
      </body>
    </html>
  );
}