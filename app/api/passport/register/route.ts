import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://app.maiat.io';

export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${API_BASE}/api/v1/passport/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Maiat-Client': req.headers.get('X-Maiat-Client') || 'passport-web',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: 'Backend temporarily unavailable. Try again in a moment.' },
      { status: 503 }
    );
  }
}
