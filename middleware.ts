import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard'];

// Routes that require admin privileges (except /admin/login)
const ADMIN_ROUTES = ['/api/admin'];

// Admin page routes (separate handling for redirect to admin login)
const ADMIN_PAGE_ROUTES = ['/admin'];

// Admin emails - hardcoded + environment variable
const HARDCODED_ADMIN_EMAILS = ['sowaxcom@gmail.com'];

function getAdminEmails(): string[] {
  const envEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
  return [...HARDCODED_ADMIN_EMAILS, ...envEmails].map(e => e.toLowerCase());
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Log pour debug
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  if (isProtectedRoute) {
    console.log('[MIDDLEWARE] Route protégée:', pathname);
    const allCookies = request.cookies.getAll();
    const supabaseCookies = allCookies.filter(c => c.name.startsWith('sb-'));
    console.log('[MIDDLEWARE] Nombre total de cookies:', allCookies.length);
    console.log('[MIDDLEWARE] Cookies Supabase:', supabaseCookies.map(c => ({
      name: c.name,
      valueLength: c.value?.length || 0,
      // Afficher les 50 premiers caractères pour debug
      valuePreview: c.value?.substring(0, 50) + '...'
    })));
  }

  // Create response to modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Get current session
  const { data: { user }, error } = await supabase.auth.getUser();

  if (isProtectedRoute) {
    console.log('[MIDDLEWARE] User trouvé:', !!user);
    console.log('[MIDDLEWARE] User email:', user?.email);
    console.log('[MIDDLEWARE] Erreur auth:', error?.message);
  }

  // Check if route requires admin authentication
  const isAdminApiRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));
  const isAdminPageRoute = ADMIN_PAGE_ROUTES.some(route => pathname.startsWith(route));
  const isAdminLoginPage = pathname === '/admin/login';

  // Redirect unauthenticated users from protected routes (dashboard)
  if (isProtectedRoute && (!user || error)) {
    console.log('[MIDDLEWARE] Redirection vers login - pas de session valide');
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Handle admin page routes (except login page)
  if (isAdminPageRoute && !isAdminLoginPage) {
    // Not authenticated - redirect to admin login
    if (!user || error) {
      console.log('[MIDDLEWARE] Redirection vers admin login - pas de session');
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Check admin authorization
    const adminEmails = getAdminEmails();
    const userEmail = user.email?.toLowerCase();

    if (adminEmails.length === 0) {
      console.warn('No admin emails configured. Admin access denied.');
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    if (!userEmail || !adminEmails.includes(userEmail)) {
      console.warn(`Unauthorized admin access attempt by: ${userEmail}`);
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Handle admin API routes
  if (isAdminApiRoute) {
    if (!user || error) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const adminEmails = getAdminEmails();
    const userEmail = user.email?.toLowerCase();

    if (adminEmails.length === 0 || !userEmail || !adminEmails.includes(userEmail)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
  }

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' fonts.cdnfonts.com fonts.googleapis.com; font-src 'self' fonts.gstatic.com fonts.cdnfonts.com; img-src 'self' data: blob: *.supabase.co; connect-src 'self' *.supabase.co wss://*.supabase.co gate.whapi.cloud graph.facebook.com; frame-src 'none'; object-src 'none'");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - public files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
