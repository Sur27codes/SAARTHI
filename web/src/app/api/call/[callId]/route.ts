import { NextRequest, NextResponse } from "next/server";

const FLASK_URL = process.env.FLASK_CALL_URL || "http://localhost:5000";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ callId: string }> }
) {
    const { callId } = await params;
    try {
        const res = await fetch(`${FLASK_URL}/api/call/${callId}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (err: any) {
        return NextResponse.json(
            { error: `Could not reach Aria calling server: ${err.message}` },
            { status: 502 }
        );
    }
}
