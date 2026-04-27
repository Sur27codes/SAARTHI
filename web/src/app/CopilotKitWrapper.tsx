"use client";

import { ReactNode } from "react";

// CopilotKit UI removed — using custom /api/chat route directly.
// No CopilotKit branding, no floating badges, full ENS agent functionality retained.
export function CopilotKitWrapper({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
