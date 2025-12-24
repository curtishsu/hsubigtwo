import { NextResponse } from 'next/server';
import {
  familyCookieName,
  isValidFourDigitPin,
  mintUnlockToken,
  rememberSeconds,
  verifyFamilyPin,
} from '../../../lib/family-auth';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const pin = (body as { pin?: unknown })?.pin;
  if (!isValidFourDigitPin(pin)) {
    return NextResponse.json({ ok: false, error: 'PIN must be exactly 4 digits' }, { status: 400 });
  }

  const ok = await verifyFamilyPin(pin);
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'Incorrect PIN' }, { status: 401 });
  }

  const token = await mintUnlockToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: familyCookieName(),
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: rememberSeconds(),
  });

  return res;
}


