import { NextResponse, type NextRequest } from "next/server";

import { validateBasicAuthorization } from "@/lib/auth/basic";

export function middleware(request: NextRequest): NextResponse {
  const username = process.env.LAB_USERNAME?.trim() ?? "";
  const password = process.env.LAB_PASSWORD ?? "";

  // Local development stays frictionless. A Vercel deployment fails closed if
  // credentials were forgotten, so external API keys cannot be used publicly.
  if (username === "" || password === "") {
    if (process.env.VERCEL !== "1") return NextResponse.next();
    return new NextResponse("Private access is not configured.", {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }

  if (validateBasicAuthorization(request.headers.get("authorization"), username, password)) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "cache-control": "no-store",
      "www-authenticate": 'Basic realm="Reel Lab", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
