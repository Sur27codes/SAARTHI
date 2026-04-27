import { NextResponse } from "next/server";

// Health check endpoint for the web app
export async function GET() {
    const flaskUrl = process.env.FLASK_CALL_URL || "http://localhost:5001";
    let flaskOnline = false;

    try {
        const res = await fetch(`${flaskUrl}/api/call`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ _ping: true }),
            signal: AbortSignal.timeout(3000),
        });
        // 400 means Flask received it (phone number missing) = online
        flaskOnline = res.status !== 502 && res.status !== 503;
    } catch {
        flaskOnline = false;
    }

    return NextResponse.json({
        status: "ok",
        flask_url: flaskUrl,
        flask_online: flaskOnline,
        timestamp: new Date().toISOString(),
    });
}
