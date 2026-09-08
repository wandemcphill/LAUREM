import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ ok: true, service: 'laurem-recruitment-platform', timestamp: new Date().toISOString() });
}
