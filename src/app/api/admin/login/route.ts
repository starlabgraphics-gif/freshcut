import { NextResponse } from "next/server";
import { checkCredentials, createSessionToken, sessionCookieHeader } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let email = "";
  let password = "";
  try {
    const body = await req.json();
    email = String(body.email ?? "");
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (checkCredentials(email, password)) {
    const res = NextResponse.json({ ok: true });
    res.headers.append("Set-Cookie", sessionCookieHeader(createSessionToken()));
    return res;
  }
  return NextResponse.json({ error: "Invalid operator credentials." }, { status: 401 });
}
