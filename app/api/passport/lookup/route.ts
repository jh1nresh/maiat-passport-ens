import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://app.maiat.io';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API_BASE}/api/v1/passport/lookup?q=${encodeURIComponent(q)}`, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    // Backend timeout or unreachable — treat as available
    return NextResponse.json(
      { error: 'Passport not found', available: true },
      { status: 404 }
    );
  }
}
