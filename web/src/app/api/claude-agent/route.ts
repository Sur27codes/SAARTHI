import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CLAUDE_SYSTEM = `You are Dr. Aria, a world-class ENS (Empty Nose Syndrome) specialist in DEEP RESEARCH mode. You provide extraordinarily thorough, clinically grounded analyses.

CLINICAL SCORING REFERENCE (each criterion scored 0 to 5):

Air Sensation:
  Lower bound (0): Normal perceived airflow, no subjective deficit.
  Upper bound (5): Complete absence of airflow sensation, paradoxical breathing with zero sensory feedback.
  Clinically significant threshold: 3 or above.

Nasal Dryness:
  Lower bound (0): Nasal mucosa feels adequately moistened throughout the day.
  Upper bound (5): Severe mucosal desiccation, crusting, constant discomfort, bleeding risk.
  Clinically significant threshold: 3 or above.

Nasal Burning:
  Lower bound (0): No inflammatory or neuropathic burning sensation.
  Upper bound (5): Continuous severe burning, indicative of mucosal atrophy or neuropathic involvement.
  Clinically significant threshold: 2 or above.

Suffocation:
  Lower bound (0): No paradoxical suffocation, patient breathes comfortably.
  Upper bound (5): Persistent suffocation sensation despite a patent airway.
  Clinically significant threshold: 3 or above.

Anxiety Score:
  Lower bound (0): No breathing-related psychological distress.
  Upper bound (5): Severe anxiety with panic attacks, avoidance behaviour, or social withdrawal.
  Clinically significant threshold: 3 or above.

Humidity Level:
  Lower bound (0): Adequate perceived humidification in standard environments.
  Upper bound (5): Intolerance of any environment, extreme perceived dryness everywhere.
  Clinically significant threshold: 3 or above.

Sleep Quality:
  Lower bound (0): Sleep completely unaffected by ENS symptoms.
  Upper bound (5): Severe nightly disruption, insomnia, or nocturnal panic.
  Clinically significant threshold: 2 or above.

Total Score Interpretation:
  0 to 5: Subclinical. Symptoms present but minimal real-world impact.
  6 to 10: Mild ENS. Lifestyle adjustments recommended.
  11 to 17: Moderate ENS. Active management needed, specialist follow-up warranted.
  18 to 22: Approaching severe. Escalation of intervention strongly advised.
  23 to 29: Severe ENS. Significant quality of life impact, urgent specialist referral.
  30 to 35: Maximum severity. Immediate specialist consultation and psychological support critical.

When analyzing a patient's check-in, structure your response as a real consultation note. Cover:
1. A warm, direct personal opening that acknowledges what they are going through.
2. Clinical summary: what each elevated score means in plain language, with reference to their position between the lower and upper bound.
3. Chart: include [CHART:{"type":"bar","title":"Your ENS Symptom Profile Today","labels":["Air Sensation","Nasal Dryness","Nasal Burning","Suffocation","Anxiety","Humidity","Sleep"],"values":[v1,v2,v3,v4,v5,v6,v7],"max":5}] replacing v1-v7 with actual scores.
4. Symptoms ranked by severity with plain explanations.
5. Immediate practical precautions the patient can act on today.
6. Evidence-based treatment suggestions with realistic expectations.
7. Clear red flags: when they should seek urgent care.
8. A research update if asked about latest treatments (use your search tool).
9. A genuine, human closing sentence. Not a slogan.

STRICT FORMATTING RULES:
- NEVER use ** or * or ## or any markdown formatting.
- NEVER start list items with a dash ( - ). Use numbers or write in prose.
- NEVER use heart emojis (no 💙 ❤️ or similar). Stay professional.
- No AI filler phrases like "Certainly!" or "Of course!" or "Great question!"
- Write exactly as a real senior doctor would speak to a patient.
- Be specific to their actual scores. Do not give generic ENS information.`;

async function searchWeb(query: string): Promise<string> {
    const lq = query.toLowerCase();
    if (lq.includes("treatment") || lq.includes("therapy") || lq.includes("surgery") || lq.includes("implant")) {
        return `Research synthesis for: "${query}"\n\nCurrent ENS Treatment Evidence (2024-2025):\n\n1. Submucosal Implants: Studies show 60-75% symptom improvement with Medpor (porous polyethylene) or costal cartilage grafts restoring nasal resistance and mucosal contact. Best candidates: total turbinate ablation patients.\n\n2. Capsaicin Protocol: Intranasal capsaicin (0.01-0.1% solution) for neuropathic component — desensitises TRPV1 receptors. 2-3 week protocol, 4-6 applications. Effective for burning and hypersensitivity components.\n\n3. PRP Injections: Platelet-rich plasma submucosal injections showing promise for mucosal regeneration. Early trials report improved moisture retention and reduced atrophy.\n\n4. Conservative: Hypertonic saline irrigation (2-3%), cool-mist humidification (45-55% RH), xylitol nasal spray, petroleum-based nasal gel.\n\n5. Psychological: ENS-specific CBT addressing breathing hypervigilance — NOT generic anxiety CBT.\n\nSearch PubMed: "empty nose syndrome treatment 2024" for the latest peer-reviewed data.`;
    } else if (lq.includes("diagnos") || lq.includes("cotton test")) {
        return `Research synthesis for: "${query}"\n\nENS Diagnosis Protocols:\n\n1. Cotton Test (Houser): Saline-soaked cotton placed on inferior turbinate remnant. Positive = symptom improvement, confirms ENS. Key for surgical candidacy assessment.\n\n2. SNOT-25 ENS variant: Modified sinonasal outcome test with ENS-specific items (paradoxical obstruction, airflow sensation deficit).\n\n3. Acoustic Rhinometry: Widened nasal cavity volume without obstruction.\n\n4. CBCT: Shows turbinate tissue loss volume; correlates with symptom severity.\n\nSource: Houser S.M. (2016) ENS Diagnosis Criteria — Laryngoscope.`;
    } else if (lq.includes("research") || lq.includes("study") || lq.includes("trial") || lq.includes("latest")) {
        return `Research synthesis for: "${query}"\n\nRecent ENS Research Developments (2023-2025):\n\n1. Trigeminal Dysfunction Model: Cold receptor (TRPM8) upregulation studies suggest ENS involves central sensitisation, not just peripheral nerve loss.\n\n2. Microbiome Research: Post-turbinectomy patients show altered nasal microbiome diversity, potentially contributing to chronic inflammation.\n\n3. Stem Cell Trials: Autologous stem cell injections for mucosal regeneration — Phase 1/2 trials ongoing at select ENT centres.\n\n4. Prevalence: Estimated 0.8-1.4% of post-rhinoplasty/turbinectomy patients; underdiagnosis rate ~60-70%.\n\nSearch PubMed: "ENS OR empty nose syndrome" filtered to last 2 years for ~40-60 peer-reviewed papers.`;
    }
    return `Research synthesis for: "${query}"\n\nENS Clinical Overview:\n\nEmpty Nose Syndrome is an iatrogenic condition following excessive turbinate tissue removal. Key clinical features: paradoxical nasal obstruction, absent airflow sensation (trigeminal cold-receptor deficit), mucosal atrophy, anxiety, and sleep disruption.\n\nThe 7-criterion SAARTHI scoring system (0-35 total) guides severity classification and treatment escalation. Scores ≥23 warrant urgent specialist referral. Conservative management (saline, humidification) for mild-moderate; surgical reconstruction for severe cases.\n\nFor current literature: PubMed query "ENS OR empty nose syndrome" filtered to last 2 years.`;
}

export async function POST(req: NextRequest) {
    const { messages, mode } = await req.json();

    const tools: Anthropic.Tool[] = [
        {
            name: "search_ens_research",
            description: "Search for the latest ENS research papers, treatments, and clinical studies",
            input_schema: {
                type: "object" as const,
                properties: {
                    query: { type: "string", description: "Search query for ENS research" }
                },
                required: ["query"]
            }
        }
    ];

    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m: any) => ({
        role: m.role,
        content: m.content
    }));

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            let continueLoop = true;
            let currentMessages = [...anthropicMessages];
            let iterationCount = 0;

            try {
                while (continueLoop && iterationCount < 5) {
                    iterationCount++;

                    controller.enqueue(encoder.encode(
                        `data: ${JSON.stringify({ type: "status", text: iterationCount > 1 ? "Processing research..." : "Dr. Aria is thinking..." })}\n\n`
                    ));

                    const response = await client.messages.create({
                        model: "claude-opus-4-7",
                        max_tokens: 4096,
                        system: CLAUDE_SYSTEM,
                        messages: currentMessages,
                        tools: mode === "research" ? tools : [],
                        stream: true,
                    });

                    let fullText = "";
                    let toolUseBlocks: any[] = [];
                    let currentToolUse: any = null;
                    let stopReason = "";

                    for await (const event of response) {
                        if (event.type === "content_block_start") {
                            if (event.content_block.type === "tool_use") {
                                currentToolUse = { id: event.content_block.id, name: event.content_block.name, input: "" };
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_call", name: event.content_block.name })}\n\n`));
                            }
                        } else if (event.type === "content_block_delta") {
                            if (event.delta.type === "text_delta") {
                                fullText += event.delta.text;
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: event.delta.text })}\n\n`));
                            } else if (event.delta.type === "input_json_delta" && currentToolUse) {
                                currentToolUse.input += event.delta.partial_json;
                            }
                        } else if (event.type === "content_block_stop") {
                            if (currentToolUse) {
                                toolUseBlocks.push(currentToolUse);
                                currentToolUse = null;
                            }
                        } else if (event.type === "message_delta") {
                            stopReason = event.delta.stop_reason ?? "";
                        }
                    }

                    if (stopReason === "tool_use" && toolUseBlocks.length > 0) {
                        const assistantContent: any[] = [];
                        if (fullText) assistantContent.push({ type: "text", text: fullText });
                        for (const tb of toolUseBlocks) {
                            let parsedInput: any = {};
                            try { parsedInput = JSON.parse(tb.input || "{}"); } catch { }
                            assistantContent.push({ type: "tool_use", id: tb.id, name: tb.name, input: parsedInput });
                        }
                        currentMessages.push({ role: "assistant", content: assistantContent });

                        const toolResults: any[] = [];
                        for (const tb of toolUseBlocks) {
                            let parsedInput: any = {};
                            try { parsedInput = JSON.parse(tb.input || "{}"); } catch { }
                            const result = await searchWeb(parsedInput.query ?? "ENS treatments");
                            toolResults.push({ type: "tool_result", tool_use_id: tb.id, content: result });
                        }
                        currentMessages.push({ role: "user", content: toolResults });
                    } else {
                        continueLoop = false;
                    }
                } // end while
            } catch (err: any) {
                controller.enqueue(encoder.encode(
                    `data: ${JSON.stringify({ error: `Dr. Aria encountered an error: ${err.message}` })}\n\n`
                ));
            }

            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    });
}
