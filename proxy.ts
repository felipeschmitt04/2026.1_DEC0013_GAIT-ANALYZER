import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 🌟 CORRIGIDO: O nome da função agora é exatamente 'proxy' para alinhar com o Next.js
export async function proxy(request: NextRequest) {
  const userRole = request.cookies.get('user-role')?.value;
  const { pathname } = request.nextUrl;

  const isAuthenticated = !!userRole;

  // ⚠️ REGRAS PARA O ADMINISTRADOR (/admin)
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated || userRole !== 'admin') {
      return NextResponse.redirect(new URL('/login-admin', request.url));
    }
  }

  // 📋 REGRAS PARA PÁGINAS GERAIS DO DASHBOARD
  const rotasDashboard = ['/pacientes', '/configuracoes', '/visualizacao', '/nova-analise', '/relatorio'];
  const acessandoDashboard = rotasDashboard.some(rota => pathname.startsWith(rota));

  if (!isAuthenticated && acessandoDashboard) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 🧠 REDIRECIONAMENTO INTELIGENTE (EVITAR TELA DE LOGIN SE JÁ LOGADO)
  if (isAuthenticated && (pathname === '/login' || pathname === '/login-admin')) {
    const homeDestino = userRole === 'admin' ? '/admin/profissionais' : '/pacientes';
    return NextResponse.redirect(new URL(homeDestino, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}