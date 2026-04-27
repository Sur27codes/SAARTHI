import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
    return NextResponse.json(
        { error: "CopilotKit endpoint is not active. Use /api/chat or /api/doctor-chat instead." },
        { status: 501 }
    );
}
