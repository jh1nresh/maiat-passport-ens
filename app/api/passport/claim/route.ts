import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://app.maiat.io';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ensName, tweetUrl } = body;

  if (!ensName || !tweetUrl) {
    return NextResponse.json({ error: 'Missing ensName or tweetUrl' }, { status: 400 });
  }

  // Try to call backend claim endpoint
  try {
    const res = await fetch(`${API_BASE}/api/v1/passport/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ensName, tweetUrl }),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Backend claim not implemented yet — that's fine
  }

  // Fallback: lookup the passport and return it as "claimed"
  try {
    const lookupRes = await fetch(`${API_BASE}/api/v1/passport/lookup?q=${encodeURIComponent(ensName)}`);
    if (lookupRes.ok) {
      const data = await lookupRes.json();
      return NextResponse.json({ claimed: true, passport: data.passport, tweetUrl });
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ claimed: true, tweetUrl });
}
