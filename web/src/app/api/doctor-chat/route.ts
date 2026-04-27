import { NextRequest } from 'next/server';

const DOCTOR_SYSTEM = `You are SAARTHI Clinical AI — an advanced clinical decision support system built specifically for physicians and ENT specialists managing Empty Nose Syndrome (ENS) patients.

You communicate directly with the treating physician. Your responses are clinical, precise, and use appropriate medical terminology. You do not simplify language for patients. You treat the doctor as a peer.

SAARTHI SCORING SYSTEM — Clinical Reference:
Each symptom scored 0–5. Total 0–35.

| Score Range | Classification | Clinical Action |
|-------------|----------------|-----------------|
| 0–5   | Subclinical    | Watchful waiting, re-assess at 4 weeks |
| 6–10  | Mild           | Conservative: saline irrigation, humidification, patient education |
| 11–17 | Moderate       | Active ENT follow-up, mucosal support protocol, CBT referral |
| 18–22 | Moderate-Severe| Escalation: specialist referral, neuropathic workup |
| 23–29 | Severe         | Urgent specialist referral, psychological support, consider implant evaluation |
| 30–35 | Critical       | Immediate multidisciplinary intervention |

SYMPTOM CLINICAL THRESHOLDS:
- Air Sensation ≥3/5: Significant trigeminal dysfunction. Airway patent but sensory deficit. Consider warm cotton test.
- Nasal Dryness ≥3/5: Persistent mucosal desiccation. Risk of epistaxis, crusting, ulceration.
- Nasal Burning ≥2/5: ANY persistent burning = possible neuropathic component. Consider capsaicin, PRP evaluation.
- Suffocation ≥3/5: Paradoxical suffocation despite patent airway. Rule out comorbid anxiety disorder.
- Anxiety ≥3/5: ENS-secondary anxiety (not primary). Responds to ENS management, not anxiolytics alone.
- Humidity ≥3/5: Cannot tolerate standard environments. Home humidification is insufficient alone.
- Sleep ≥2/5: Any ENS sleep disruption warrants intervention — sleep deprivation amplifies ENS symptom perception.

TREATMENT FRAMEWORK:
Conservative (Scores 6–17):
- Isotonic/hypertonic saline irrigation (Neil Med, buffered)
- Cool-mist humidifier, 45–55% indoor humidity
- Xylitol nasal spray for mucosal moisturisation
- Avoid drying environments, forced-air heating, aircraft without humidification
- ENS-aware breathing retraining (diaphragmatic, pursed-lip)

Moderate-Severe (Scores 18–29):
- ENT specialist referral (turbinate-experienced)
- Neuropathic pain evaluation if burning ≥3/5
- Low-dose gabapentin trial for neuropathic component (off-label)
- Capsaicin nasal desensitisation protocol
- ENS-specific psychological support (NOT generic CBT)
- Platelet-rich plasma (PRP) nasal injections — emerging, consider referral

Severe/Critical (Scores 30–35 or surgical candidates):
- Surgical implant evaluation: submucosal implants (Medpor, cartilage), turbinate reconstruction
- Multidisciplinary team: ENT + neurologist + psychiatrist + pain specialist
- Cotton test as diagnostic + temporary symptomatic relief
- Document for insurance/medicolegal: chronic disability pathway

TREND ANALYSIS PATTERNS:
When discussing 7-day history:
- Red→Yellow→Green: Positive trajectory. Maintain current protocol. Review in 2 weeks.
- Green→Yellow→Red: Acute deterioration. Rule out trigger (infection, environment, medication). Urgent review.
- Persistent Red (≥3 days): Refractory ENS. Consider escalation pathway. Review surgical candidacy.
- Missing data (grey): Compliance barrier. Consider patient burden, mental state. Proactive outreach.

CHART INSTRUCTIONS:
When the doctor wants a visual of patient scores:
Include: [CHART:{"type":"bar","title":"Patient ENS Score Profile","labels":["Air Sensation","Nasal Dryness","Nasal Burning","Suffocation","Anxiety","Humidity","Sleep"],"values":[v1,v2,v3,v4,v5,v6,v7],"max":5}]

REFERRAL LETTER GENERATION:
When asked, generate a professional referral letter with: Patient presentation, 7-day SAARTHI score history, symptom breakdown, current management, reason for referral, and clinical urgency.

RESPONSE FORMAT:
- Use clinical language. Do NOT simplify.
- Use structured sections with headers when appropriate.
- Bullet points are acceptable for clinical checklists.
- You can use medical abbreviations (ENT, CBT, PRP, MCS, etc.)
- Keep responses concise but complete. Avoid padding.
- When patient data is provided in context, reference specific scores.

SCOPE:
- Focus on ENS clinical management only.
- For unrelated conditions: "That falls outside ENS-SAARTHI scope. Please refer to the appropriate specialty."
- Never provide patient-facing counselling language — you are communicating with the physician only.`;

const MCP_SERVER_URL = process.env.MCP_SERVER_URL ?? "http://127.0.0.1:8000/sse";

// ── MCP connection with hard 3-second timeout ─────────────────────────────
async function getMCPTools() {
    try {
        const connectPromise = (async () => {
            const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
            const { SSEClientTransport } = await import("@modelcontextprotocol/sdk/client/sse.js");
            const transport = new SSEClientTransport(new URL(MCP_SERVER_URL));
            const client = new Client({ name: "SAARTHI Doctor Agent", version: "1.0.0" }, { capabilities: {} });
            await client.connect(transport);
            const toolsResult = await client.listTools();
            return { client, tools: toolsResult.tools };
        })();
        const timeout = new Promise<{ client: null; tools: [] }>(
            (_, reject) => setTimeout(() => reject(new Error("MCP timeout")), 3000)
        );
        return await Promise.race([connectPromise, timeout]);
    } catch {
        return { client: null, tools: [] };
    }
}

function buildGroqTools(mcpTools: any[]) {
    return mcpTools.map(tool => ({
        type: "function" as const,
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema || { type: "object", properties: {} },
        }
    }));
}

export async function POST(req: NextRequest) {
    const { messages, patientContext } = await req.json();

    const { client: mcpClient, tools: mcpTools } = await getMCPTools();
    const groqTools = buildGroqTools(mcpTools);

    const systemWithContext = patientContext
        ? `${DOCTOR_SYSTEM}\n\n─── CURRENT PATIENT DATA ───\n${patientContext}`
        : DOCTOR_SYSTEM;

    const groqMessages = [
        { role: "system", content: systemWithContext },
        ...messages
    ];

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            let currentMessages = [...groqMessages];
            let iterationCount = 0;
            const MAX_ITERATIONS = 5;

            try {
                while (iterationCount < MAX_ITERATIONS) {
                    iterationCount++;

                    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            model: "llama-3.3-70b-versatile",
                            messages: currentMessages,
                            tools: groqTools.length > 0 ? groqTools : undefined,
                            tool_choice: groqTools.length > 0 ? "auto" : undefined,
                            stream: true,
                            max_tokens: 2048,
                            temperature: 0.5,
                        }),
                    });

                    if (!response.ok) {
                        const err = await response.text();
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `Groq API error ${response.status}: ${err.slice(0, 200)}` })}\n\n`));
                        break;
                    }

                    const reader = response.body!.getReader();
                    const decoder = new TextDecoder();
                    let buffer = "";
                    let fullContent = "";
                    let toolCalls: any[] = [];
                    let finishReason = "";

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split("\n");
                        buffer = lines.pop() || "";

                        for (const line of lines) {
                            if (!line.startsWith("data: ")) continue;
                            const data = line.slice(6).trim();
                            if (data === "[DONE]") continue;
                            try {
                                const chunk = JSON.parse(data);
                                const choice = chunk.choices?.[0];
                                if (!choice) continue;
                                finishReason = choice.finish_reason || finishReason;
                                const delta = choice.delta;
                                if (delta?.content) {
                                    fullContent += delta.content;
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: delta.content })}\n\n`));
                                }
                                if (delta?.tool_calls) {
                                    for (const tc of delta.tool_calls) {
                                        if (!toolCalls[tc.index]) toolCalls[tc.index] = { id: "", type: "function", function: { name: "", arguments: "" } };
                                        if (tc.id) toolCalls[tc.index].id = tc.id;
                                        if (tc.function?.name && !toolCalls[tc.index].function.name) toolCalls[tc.index].function.name = tc.function.name;
                                        if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
                                    }
                                }
                            } catch { /* skip malformed */ }
                        }
                    }

                    if (finishReason === "tool_calls" && toolCalls.length > 0 && mcpClient) {
                        currentMessages.push({ role: "assistant", content: fullContent || null, tool_calls: toolCalls.filter(Boolean) } as any);
                        for (const tc of toolCalls.filter(Boolean)) {
                            let args = {};
                            try { args = JSON.parse(tc.function.arguments); } catch { }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_call", name: tc.function.name })}\n\n`));
                            let toolResult = "Tool unavailable.";
                            try {
                                const result = await (mcpClient as any).callTool({ name: tc.function.name, arguments: args });
                                toolResult = (result.content as any)?.[0]?.text || JSON.stringify(result.content);
                            } catch (e) {
                                toolResult = `Tool error: ${e instanceof Error ? e.message : String(e)}`;
                            }
                            currentMessages.push({ role: "tool", tool_call_id: tc.id, content: toolResult });
                        }
                        continue;
                    }
                    break;
                }
            } catch (err: any) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `Stream error: ${err.message}` })}\n\n`));
            }

            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
            if (mcpClient) { try { await (mcpClient as any).close?.(); } catch { } }
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
