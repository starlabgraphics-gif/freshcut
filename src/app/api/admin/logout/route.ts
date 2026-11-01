import { NextResponse } from "next/server";
import { SESSION_CLEAR_HEADER } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", SESSION_CLEAR_HEADER);
  return res;
}
