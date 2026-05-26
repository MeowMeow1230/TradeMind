import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { code, metrics } = body;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/deploy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, sharpe_ratio: metrics?.sharpe_ratio || 0 }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}
