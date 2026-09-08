import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { adminSessionCookieName, makeAdminSession } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredEmail || !configuredPassword) return NextResponse.json({ error: 'Admin authentication is not configured.' }, { status: 503 });
  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const email = body.email?.trim().toLowerCase() || '';
  const password = body.password || '';
  const same = (a: string, b: string) => {
    const aa = Buffer.from(a); const bb = Buffer.from(b);
    return aa.length === bb.length && timingSafeEqual(aa, bb);
  };
  if (!same(email, configuredEmail) || !same(password, configuredPassword)) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: adminSessionCookieName, value: makeAdminSession(configuredEmail), httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 8 * 60 * 60 });
  return response;
}
