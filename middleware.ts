import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const session = request.cookies.get("access_token");
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/me`, {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
  });

  if (!res.ok) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/projects/:path*"],
};