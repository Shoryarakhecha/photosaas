// src/app/api/auth/logout/route.ts

import { NextResponse } from "next/server";
import { COOKIE_OPTIONS } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_OPTIONS.name, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
