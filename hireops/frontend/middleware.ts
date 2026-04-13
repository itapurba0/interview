import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';


const ROLE_ROUTES: Record<string, string> = {
  candidate: '/candidate',
  hr: '/hr',
  manager: '/manager',
};

// Routes that should NOT be accessible if the user is already logged in
const AUTH_ROUTES = ['/login', '/register'];

/**
 * Robust Edge-compatible JWT Decoder
 */
function decodeJWTPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

/**
 * Main Middleware Function (Next.js Requirement)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Retrieve the JWT from the secure session cookie
  const token = request.cookies.get('hireops_session')?.value;

  // 2. Handle Authentication Routes (Login/Register)
  if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    if (token) {
      const payload = decodeJWTPayload(token);
      const role = payload?.role?.toLowerCase();
      
      // If a valid session exists, bounce the user to their dashboard
      if (role && ROLE_ROUTES[role]) {
        return NextResponse.redirect(new URL(ROLE_ROUTES[role], request.url));
      }
    }
    return NextResponse.next();
  }

  // 3. Determine if the current route is a Protected Dashboard Route
  const isDashboardRoute = Object.values(ROLE_ROUTES).some(route => pathname.startsWith(route));

  if (isDashboardRoute) {
    // 4. Force authentication if no token is present
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 5. Perform RBAC Logic
    const payload = decodeJWTPayload(token);
    const userRole = payload?.role?.toLowerCase();

    // If token is invalid or role is missing, redirect to login
    if (!userRole || !ROLE_ROUTES[userRole]) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // 6. Strict Role Boundary Check
    const targetRole = Object.keys(ROLE_ROUTES).find(role => 
      pathname.startsWith(ROLE_ROUTES[role])
    );

    // If accessing a dashboard that doesn't match the user's role
    if (targetRole && userRole !== targetRole) {
      return NextResponse.redirect(new URL(ROLE_ROUTES[userRole], request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

/**
 * CONFIGURATION: Matcher
 */
export const config = {
  matcher: [
    '/candidate/:path*',
    '/hr/:path*',
    '/manager/:path*',
    '/login',
    '/register'
  ],
};
