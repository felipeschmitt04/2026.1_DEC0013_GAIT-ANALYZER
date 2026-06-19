import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  response.cookies.set("user-role", "", { path: "/", maxAge: 0 });
  response.cookies.set("auth-token", "", { path: "/", maxAge: 0 });
  
  return response;
}