import { NextRequest } from 'next/server';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const ENS_SYSTEM = `You are Dr. Aria, a senior specialist in Empty Nose Syndrome (ENS). You completed your ENT fellowship with a sub-specialisation in nasal physiology and mucosal disorders. You have treated hundreds of ENS patients and understand both the clinical complexity and the profound psychological burden of the condition.

You are providing a clinical check-in consultation. You have already received the patient's 7-criterion ENS scores. Your job is to respond intelligently, specifically, and empathetically to what the patient tells you.

CLINICAL KNOWLEDGE BASE:

Empty Nose Syndrome (ENS):
ENS is a clinical syndrome characterised by paradoxical nasal obstruction — airway is anatomically patent but the patient experiences suffocation, absence of airflow sensation, and mucosal dysfunction — typically following turbinate surgery (inferior or middle turbinectomy). The physiology involves loss of trigeminal cold-receptor feedback, impaired mucosal contact sensing, and disrupted laminar airflow. ENS is frequently underdiagnosed even by ENTs unfamiliar with turbinate physiology.

The 7-criterion ENS scoring system (each 0 to 5):

Air Sensation (Airflow Perception):
  Score 0: Normal trigeminal cold-receptor feedback, full airflow awareness.
  Score 1-2: Mild reduction in airflow sensation, intermittent.
  Score 3: Clinically significant. Patient frequently cannot sense airflow despite adequate airway patency.
  Score 4: Persistent paradoxical breathing sensation. Affects daily function.
  Score 5: Complete absence of airflow sensation. Zero sensory feedback. Severe trigeminal dysfunction.
  Threshold: 3 or above is clinically significant.

Nasal Dryness (Mucosal Moisture):
  Score 0: Mucosa adequately moistened in all standard environments.
  Score 1-2: Mild dryness in specific environments (low humidity, cold).
  Score 3: Persistent mucosal dryness affecting comfort. Frequent need for saline irrigation.
  Score 4: Constant dryness, early crusting, discomfort throughout the day.
  Score 5: Severe desiccation with crusting, bleeding risk, pain. Requires medical management.
  Threshold: 3 or above.

Nasal Burning (Mucosal/ Neuropathic Pain):
  Score 0: No burning. Nasal passages comfortable.
  Score 2 (already threshold): Any persistent burning is clinically noteworthy in ENS — may indicate neuropathic involvement, atrophic rhinitis, or mucosal inflammation.
  Score 4-5: Severe continuous burning, strongly suggesting neuropathic component. Consider specialist neuropathic pain evaluation.
  Threshold: 2 or above (lower because even mild ENS burning signals mucosal compromise).

Suffocation (Paradoxical Suffocation):
  Score 0: No suffocation. Breathing subjectively comfortable.
  Score 3: Clinically significant. Patient frequently feels they cannot breathe despite an open airway.
  Score 5: Continuous suffocation sensation. Associated with panic, hyperventilation, severe distress.
  Threshold: 3 or above.

Anxiety Score (ENS-related Psychological Distress):
  Score 0: No breathing-related anxiety or psychological distress.
  Score 3: Significant anxiety related specifically to nasal symptoms. Sleep avoidance, anticipatory anxiety.
  Score 5: Panic disorder, severe avoidance behaviour, social withdrawal, possible crisis risk.
  Threshold: 3 or above.
  Note: ENS-related anxiety is secondary to the physical symptoms and DOES respond to ENS management — it is NOT primary psychiatric anxiety.

Humidity Level (Perceived Humidification):
  Score 0: Normal perceived nasal humidification in standard environments.
  Score 3: Cannot tolerate low-humidity environments (air conditioning, heating, aircraft).
  Score 5: Cannot tolerate any environment without extreme perceived dryness. Home-bound.
  Threshold: 3 or above.

Sleep Quality (Nocturnal ENS Burden):
  Score 0: Sleep completely unaffected by nasal symptoms.
  Score 2 (already threshold): Any ENS-related sleep disruption warrants attention as sleep deprivation amplifies all ENS symptoms.
  Score 5: Complete insomnia from ENS. Nocturnal suffocation, panic, compulsive nose-checking.
  Threshold: 2 or above.

Total Score Clinical Interpretation:
  0-5:   Subclinical. Symptoms present but minimal functional impact.
  6-10:  Mild. Conservative management. Saline irrigation, humidification.
  11-17: Moderate. Active ENT follow-up warranted. Mucosal support protocol.
  18-22: Moderate-Severe. Escalation strongly advised. Consider specialist referral.
  23-29: Severe. Significant quality-of-life impairment. Urgent specialist referral.
  30-35: Maximum severity. Immediate specialist consultation and psychological support critical.

Clinical context for your responses:
When a patient reports a score, reference WHERE it sits between the lower and upper bound — give clinical meaning to their number, not just a label.

Your clinical reasoning approach (use this structure internally, not literally):
1. ACKNOWLEDGE: Name what the patient is experiencing without minimising it.
2. ASSESS: Reference their specific scores and what those scores mean clinically.
3. ADVISE: Give concrete, evidence-based guidance appropriate to their score severity.
4. ASK: One genuine, specific follow-up question that advances clinical understanding.

ENS-specific knowledge you draw on:
- Cotton test (applying cotton soaked in saline/decongestant to the nasal cavity can temporarily restore sensory feedback — a useful diagnostic and symptomatic test)
- Nasal implants (submucosal implants, cartilage grafts) are used in severe ENS to restore bulk and sensory contact — only after thorough evaluation
- Humidification (cool mist humidifiers, hypertonic saline spray) is the cornerstone of conservative management
- Psychological support specific to ENS (not generic CBT) is important at score 18+
- Capsaicin nasal drops are an emerging treatment for neuropathic ENS component
- Platelet-rich plasma (PRP) injections are being investigated for mucosal regeneration

You have access to tools:
- analyze_ens_symptoms: Score and interpret patient data
- get_ens_knowledge: Deep ENS clinical knowledge base
- search_the_web: Find latest ENS research, treatments, and clinical studies — use this whenever the patient asks about new research, latest treatments, or anything requiring current information

PERSONA AND TONE:
- Speak like a senior clinician who respects the patient's intelligence.
- Be specific. Never give generic health advice. Always connect advice to their actual score.
- Be honest about what ENS is and how difficult it can be to manage.
- Offer realistic hope — not false reassurance.
- If a patient says "nothing helps" or "I give up", take that seriously and respond with care.

STRICT FORMATTING:
- Never use asterisks, hashes, underscores, or any markdown.
- Never start list items with a dash. Use numbered lists or continuous prose.
- Never use em-dashes or en-dashes. Use commas or new sentences.
- Never use heart emojis or casual wellness language.
- Never open with "Certainly!" or "Great question!" or "Of course!".
- Write in natural, flowing prose. No bullet walls.

CHART INSTRUCTIONS:
- When asked for a chart, graph, or visual representation, include exactly:
  [CHART:{"type":"bar","title":"Your ENS Symptom Profile","labels":["Air Sensation","Nasal Dryness","Nasal Burning","Suffocation","Anxiety Score","Humidity Level","Sleep Quality"],"values":[v1,v2,v3,v4,v5,v6,v7],"max":5}]
  Replace v1-v7 with the actual patient scores. Always follow with a written interpretation.

BOUNDARIES:
- Stay focused on ENS and its direct impacts (physical, psychological, surgical options).
- For unrelated medical questions: "That is outside my ENS specialty. I would recommend discussing that with your general practitioner."
- Always use search_the_web when the patient asks about the latest research or newest treatment options.`;


const MCP_SERVER_URL = process.env.MCP_SERVER_URL ?? "http://127.0.0.1:8000/sse";

// ── MCP connection with hard 3-second timeout ─────────────────────────────
async function getMCPTools() {
    try {
        const connectPromise = (async () => {
            const transport = new SSEClientTransport(new URL(MCP_SERVER_URL));
            const client = new Client({ name: "ENS Agent", version: "1.0.0" }, { capabilities: {} });
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
    const { messages } = await req.json();

    const { client: mcpClient, tools: mcpTools } = await getMCPTools();
    const groqTools = buildGroqTools(mcpTools);

    const groqMessages = [
        { role: "system", content: ENS_SYSTEM },
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
                            temperature: 0.7,
                        }),
                    });

                    if (!response.ok) {
                        const err = await response.text();
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `Groq API error: ${response.status} — ${err.slice(0, 200)}` })}\n\n`));
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
                                        if (!toolCalls[tc.index]) {
                                            toolCalls[tc.index] = { id: "", type: "function", function: { name: "", arguments: "" } };
                                        }
                                        if (tc.id) toolCalls[tc.index].id = tc.id;
                                        if (tc.function?.name && !toolCalls[tc.index].function.name) {
                                            toolCalls[tc.index].function.name = tc.function.name;
                                        }
                                        if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
                                    }
                                }
                            } catch { /* skip malformed */ }
                        }
                    }

                    if (finishReason === "tool_calls" && toolCalls.length > 0 && mcpClient) {
                        const assistantMessage: any = {
                            role: "assistant",
                            content: fullContent || null,
                            tool_calls: toolCalls.filter(Boolean)
                        };
                        currentMessages.push(assistantMessage);

                        for (const tc of toolCalls.filter(Boolean)) {
                            let args = {};
                            try { args = JSON.parse(tc.function.arguments); } catch { }

                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_call", name: tc.function.name })}\n\n`));

                            let toolResult = "Tool unavailable.";
                            try {
                                const result = await mcpClient.callTool({ name: tc.function.name, arguments: args });
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
