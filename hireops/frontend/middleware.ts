import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Lightweight Edge-compatible JWT Decoder
function decodeJWTPayload(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Protect all Dashboard Routes
  if (pathname.startsWith('/candidate') || pathname.startsWith('/hr') || pathname.startsWith('/manager')) {
    
    // 1. Retrieve the JWT from a secure HttpOnly cookie
    const token = request.cookies.get('hireops_session')?.value;

    if (!token) {
      // Unauthenticated -> redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // 2. Decode Payload
    const payload = decodeJWTPayload(token);
    
    if (!payload || !payload.role) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const lowerRole = payload.role.toLowerCase();

    // 3. Authorization & Redirection Logic
    // Force users into their role-specific dashboards to prevent unauthorized tenant access
    if (pathname.startsWith('/candidate') && lowerRole !== 'candidate') {
      return NextResponse.redirect(new URL(`/${lowerRole}`, request.url));
    }
    
    if (pathname.startsWith('/hr') && lowerRole !== 'hr') {
      return NextResponse.redirect(new URL(`/${lowerRole}`, request.url));
    }
    
    if (pathname.startsWith('/manager') && lowerRole !== 'manager') {
      return NextResponse.redirect(new URL(`/${lowerRole}`, request.url));
    }

    return NextResponse.next();
  }

  // Allow access for unauthenticated public routes (Landing, Auth, Jobs API)
  return NextResponse.next();
}

// Config to run middleware precisely on target routes
export const config = {
  matcher: ['/candidate/:path*', '/hr/:path*', '/manager/:path*'],
};
