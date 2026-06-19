import { NextResponse } from 'next/server' // resposta
import type { NextRequest } from 'next/server' //dados

export async function proxy(request: NextRequest) {
  const userRole = request.cookies.get('user-role')?.value;
  const { pathname } = request.nextUrl; // endereço depois de 3000

  const isAuthenticated = !!userRole;

  // se não é admin vai pro login-admin
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated || userRole !== 'admin') {
      return NextResponse.redirect(new URL('/login-admin', request.url));
    }
  }

  const rotasDashboard = ['/pacientes', '/configuracoes', '/visualizacao', '/nova-analise', '/relatorio'];
  const acessandoDashboard = rotasDashboard.some(rota => pathname.startsWith(rota)); // estado de acesso, testa cada rota

  if (!isAuthenticated && acessandoDashboard) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // evita fazer login logado
  if (isAuthenticated && (pathname === '/login' || pathname === '/login-admin')) {
    const homeDestino = userRole === 'admin' ? '/admin/profissionais' : '/pacientes';
    return NextResponse.redirect(new URL(homeDestino, request.url));
  }

  return NextResponse.next();
}

// não roda em api e imaagens
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}