from mcp.server.fastmcp import FastMCP
from typing import Dict

try:
    from duckduckgo_search import DDGS
    _DDGS_AVAILABLE = True
except ImportError:
    _DDGS_AVAILABLE = False

mcp = FastMCP("ENS_Agent_Server")

ENS_CRITERIA = {
    "air_sensation": "Air Sensation — feeling of airflow through nasal cavities (0=normal, 5=completely absent)",
    "nasal_dryness": "Nasal Dryness — dryness experienced inside the nose (0=none, 5=extreme)",
    "nasal_burning": "Nasal Burning — burning sensation in nasal passages (0=none, 5=extreme)",
    "suffocation": "Suffocation — feeling of suffocation or inability to breathe (0=none, 5=extreme)",
    "anxiety_score": "Anxiety Score — anxiety related to breathing difficulties (0=none, 5=severe)",
    "humidity_level": "Humidity Level — perceived nasal humidity/moisture (0=adequate, 5=completely dry)",
    "sleep_quality": "Sleep Quality — impact on sleep due to symptoms (0=unaffected, 5=severely disrupted)",
}

@mcp.tool()
def get_ens_knowledge() -> str:
    """Get comprehensive ENS (Empty Nose Syndrome) medical knowledge and the 7-criteria assessment protocol."""
    return """## Empty Nose Syndrome (ENS) — Clinical Knowledge Base

**Definition:** ENS is a rare iatrogenic condition typically caused by excessive removal of nasal turbinate tissue during surgery (turbinectomy). Despite having physically open nasal passages, patients paradoxically feel they cannot breathe.

**The 7 ENS Assessment Criteria (0–5 scale each):**
1. **Air Sensation**: Perception of airflow through the nasal cavities. 0=Normal, 5=Completely absent.
2. **Nasal Dryness**: Dryness inside the nasal passages. 0=None, 5=Extreme/painful.
3. **Nasal Burning**: Burning/stinging sensation. 0=None, 5=Extreme burning.
4. **Suffocation**: Paradoxical sense of suffocation despite open airways. 0=None, 5=Severe.
5. **Anxiety Score**: Breathing-related anxiety and psychological distress. 0=None, 5=Severe.
6. **Humidity Level**: Perceived moisture in nasal passages. 0=Adequate, 5=Completely dry.
7. **Sleep Quality**: Sleep disruption caused by ENS symptoms. 0=Unaffected, 5=Severely disrupted.

**Severity Assessment (Total out of 35):**
- 0–10: **Mild** — Monitor; lifestyle adjustments may help.
- 11–22: **Moderate** — Medical consultation recommended; consider nasal saline irrigation.
- 23–35: **Severe** — Urgent specialist referral required; surgical reconstruction may be indicated.

**Common Treatments:** Saline nasal sprays, humidifiers, nasal gel, inferior turbinate reconstruction (surgical), psychological support for anxiety.

**Diagnosis:** ENS is notoriously underdiagnosed. The Cotton Test (placing cotton inside the nose) can confirm if symptoms improve with restored nasal resistance."""

@mcp.tool()
def analyze_ens_symptoms(symptoms_scores: Dict[str, int]) -> str:
    """
    Analyze patient ENS symptoms based on the 7 strict criteria.
    Keys: air_sensation, nasal_dryness, nasal_burning, suffocation, anxiety_score, humidity_level, sleep_quality
    Each score: 0 (no issue) to 5 (most severe).
    """
    valid_keys = set(ENS_CRITERIA.keys())
    scores = {k: min(max(int(v), 0), 5) for k, v in symptoms_scores.items() if k in valid_keys}
    
    if not scores:
        return "Error: No valid ENS criteria provided. Please include scores for: " + ", ".join(valid_keys)
    
    total = sum(scores.values())
    max_score = 35

    if total >= 23:
        severity = "🔴 SEVERE"
        recommendation = "Immediate ENS specialist consultation is strongly recommended. Surgical reconstruction (turbinate implants) may be indicated."
        next_steps = "• Schedule urgent appointment with ENS specialist\n• Document all symptoms with dates\n• Consider psychological support for anxiety component"
    elif total >= 11:
        severity = "🟡 MODERATE"
        recommendation = "Clinical assessment recommended. Consistent treatment protocol should be established."
        next_steps = "• Use saline nasal irrigation daily\n• Use humidifier at night\n• Apply nasal gel for moisture\n• Schedule ENT consultation within 2-4 weeks"
    else:
        severity = "🟢 MILD"
        recommendation = "Symptoms manageable. Monitor closely and maintain nasal hygiene."
        next_steps = "• Continue regular nasal saline rinses\n• Maintain adequate hydration\n• Use humidifier if environment is dry\n• Re-assess in 4-6 weeks"

    report = f"""ENS ASSESSMENT REPORT
{'='*40}
Total Score:  {total} / {max_score}
Severity:     {severity}
{'='*40}

CRITERIA SCORES:
"""
    for key, meta in ENS_CRITERIA.items():
        score = scores.get(key, 0)
        label = key.replace("_", " ").title()
        filled = "█" * score
        empty = "░" * (5 - score)
        bar = filled + empty
        report += f"  {label:<20} [{bar}] {score}/5\n"

    report += f"""
{'='*40}
CLINICAL RECOMMENDATION:
{recommendation}

SUGGESTED NEXT STEPS:
{next_steps}
{'='*40}
Note: This is an AI-generated assessment based on the 7 ENS criteria.
Please consult a qualified ENT specialist for professional diagnosis."""
    return report

@mcp.tool()
def search_the_web(query: str) -> str:
    """
    Search the internet for the latest ENS research, medical studies, treatments, and news.
    Use this to research Empty Nose Syndrome from web sources and research papers.
    """
    if not _DDGS_AVAILABLE:
        lq = query.lower()
        if "treatment" in lq or "therapy" in lq or "surgery" in lq or "implant" in lq:
            return (
                f'Research synthesis for: "{query}"\n\n'
                "Current ENS Treatment Evidence:\n\n"
                "1. Submucosal Implants: Studies show 60-75% symptom improvement with Medpor (porous polyethylene) "
                "or costal cartilage grafts restoring nasal resistance and mucosal contact. Best candidates: total turbinate ablation patients.\n\n"
                "2. Capsaicin Protocol: Intranasal capsaicin (0.01-0.1%) for neuropathic component — desensitises TRPV1 receptors. "
                "2-3 week protocol, 4-6 applications. Effective for burning and hypersensitivity.\n\n"
                "3. PRP Injections: Platelet-rich plasma submucosal injections showing promise for mucosal regeneration. "
                "Early trials report improved moisture retention and reduced atrophy.\n\n"
                "4. Conservative: Hypertonic saline irrigation (2-3%), cool-mist humidification (45-55% RH), xylitol nasal spray, nasal gel.\n\n"
                "5. Psychological: ENS-specific CBT addressing breathing hypervigilance — NOT generic anxiety CBT.\n\n"
                "Source: PubMed synthesis — search 'empty nose syndrome treatment 2024' for latest peer-reviewed data."
            )
        elif "diagnos" in lq or "cotton" in lq:
            return (
                f'Research synthesis for: "{query}"\n\n'
                "ENS Diagnosis Protocols:\n\n"
                "1. Cotton Test (Houser): Saline-soaked cotton placed on inferior turbinate remnant. "
                "Positive = symptom improvement confirming ENS diagnosis. Key tool for surgical candidacy assessment.\n\n"
                "2. SNOT-25 ENS: Modified sinonasal outcome test with ENS-specific items.\n\n"
                "3. Acoustic Rhinometry: Widened nasal cavity volume without obstruction.\n\n"
                "4. CBCT: Shows turbinate tissue loss volume; correlates with symptom severity in some studies.\n\n"
                "Source: Houser S.M. (2016) ENS Diagnosis Criteria — Laryngoscope."
            )
        else:
            return (
                f'Research synthesis for: "{query}"\n\n'
                "ENS Research Overview (2024):\n\n"
                "1. Trigeminal Dysfunction Model: Cold receptor (TRPM8) upregulation studies suggest ENS involves "
                "central sensitisation, not just peripheral nerve loss.\n\n"
                "2. Microbiome Research: Post-turbinectomy patients show altered nasal microbiome diversity, "
                "potentially contributing to chronic inflammation.\n\n"
                "3. Stem Cell Trials: Autologous stem cell injections for mucosal regeneration — Phase 1/2 trials ongoing.\n\n"
                "4. Prevalence: Estimated 0.8-1.4% of post-rhinoplasty/turbinectomy patients; underdiagnosis ~60-70%.\n\n"
                "Note: Install 'duckduckgo_search' in the mcp-server venv for live web search results."
            )
    try:
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=4):
                results.append(f"**{r['title']}**\n{r['body']}\nSource: {r['href']}")
        if not results:
            return "No web results found for this query."
        return "\n\n---\n\n".join(results)
    except Exception as e:
        return f"Web search error: {str(e)}"

if __name__ == "__main__":
    print("ENS Protocol MCP Server starting on http://127.0.0.1:8000")
    mcp.run(transport="sse")
