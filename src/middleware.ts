import { NextResponse, type NextRequest } from "next/server";

/** No ingestion or mutation surface: reject writes even to retired routes. */
export function middleware(request: NextRequest) {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return NextResponse.json({ error: "This application is read-only." }, {
      status: 405, headers: { Allow: "GET, HEAD, OPTIONS" },
    });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
