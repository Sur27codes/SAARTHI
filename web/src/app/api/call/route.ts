import { NextRequest, NextResponse } from "next/server";

const FLASK_URL = process.env.FLASK_CALL_URL || "http://localhost:5001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${FLASK_URL}/api/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Could not reach Aria calling server: ${err.message}. Make sure Flask is running on port 5001.` },
      { status: 502 }
    );
  }
}
