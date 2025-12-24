import { NextRequest, NextResponse } from 'next/server';
import { familyCookieName, verifyUnlockToken } from './lib/family-auth';

function isAlwaysAllowedPath(pathname: string): boolean {
  if (pathname === '/unlock') return true;
  if (pathname === '/api/unlock') return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (isAlwaysAllowedPath(pathname)) return NextResponse.next();

  const token = req.cookies.get(familyCookieName())?.value;
  if (token && (await verifyUnlockToken(token))) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/unlock';
  url.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Exclude Next internals & public static files.
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|avatars/).*)',
  ],
};


