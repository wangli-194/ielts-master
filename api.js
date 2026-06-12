// DeepSeek API — OpenAI-compatible format
const API_URL = "https://api.deepseek.com/v1/chat/completions";
const MODEL = "deepseek-chat";  // deepseek-chat = DeepSeek-V3，性价比最高

function getKey() {
  return localStorage.getItem("ielts_master_apikey") || "";
}

function headers() {
  const key = getKey();
  if (!key) throw new Error("NO_API_KEY");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${key}`,
  };
}

// Convert Anthropic-style {system, messages} → OpenAI-style messages array
function buildMessages(messages, systemPrompt) {
  const result = [];
  if (systemPrompt) result.push({ role: "system", content: systemPrompt });
  result.push(...messages);
  return result;
}

export async function callClaude(messages, systemPrompt = "", maxTokens = 1000) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: buildMessages(messages, systemPrompt),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function callClaudeStream(messages, systemPrompt = "", onChunk, maxTokens = 1000) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      stream: true,
      messages: buildMessages(messages, systemPrompt),
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") return;
      try {
        const parsed = JSON.parse(json);
        const text = parsed?.choices?.[0]?.delta?.content;
        if (text) onChunk(text);
      } catch (_) {}
    }
  }
}

// ── Prompts ──────────────────────────────────────────────────────────────────

export const EXAMINER_SYSTEM = (part, topic) => `
You are a professional IELTS speaking examiner conducting a Band 7–9 level Part ${part} interview.
Topic: "${topic}"

Strict rules:
- Ask ONE focused question per turn. Never ask two questions at once.
- Part 1: short personal questions, expect 2–4 sentence answers
- Part 2: present a cue card with 4 bullet prompts, say "You have one minute to prepare", then after candidate speaks ask 1–2 brief follow-up questions
- Part 3: abstract, analytical questions; push for reasons and examples
- Your turn must be 1–3 sentences MAX. Do not explain the format.
- After 8 candidate turns, say exactly: "Thank you. That's the end of Part ${part}."
- Never break character. Never comment on scores during the session.
- Speak naturally, as a British examiner would.
`.trim();

export async function scoreSpeaking(transcript) {
  const system = `You are a senior IELTS examiner. Analyze candidate speech strictly against the official IELTS Speaking Band Descriptors. Respond ONLY with valid JSON — no markdown, no explanation outside the JSON.`;

  const prompt = `Analyze this IELTS speaking transcript and return ONLY this JSON (no markdown):
{
  "overall": 4.5,
  "fluency":       { "score": 4.5, "comment": "one sentence", "tip": "one actionable tip" },
  "lexical":       { "score": 4.0, "comment": "...", "tip": "...", "suggestions": ["weak → stronger"] },
  "grammar":       { "score": 4.0, "comment": "...", "tip": "...", "errors": ["wrong → correct"] },
  "pronunciation": { "score": 4.5, "comment": "...", "tip": "..." }
}

Transcript:
${transcript}`;

  const raw = await callClaude([{ role: "user", content: prompt }], system, 900);
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return null;
  }
}

export async function lookupWord(word) {
  const prompt = `For the English word "${word}", return ONLY valid JSON (no markdown):
{
  "word": "${word}",
  "phonetic": "/IPA/",
  "partOfSpeech": "adjective",
  "definition": "简明中文释义",
  "definitionEn": "concise English definition",
  "example": "A natural IELTS-level Academic sentence using this word.",
  "synonyms": ["synonym1", "synonym2", "synonym3"],
  "ieltsBand": 7,
  "collocations": ["common collocation 1", "common collocation 2"]
}`;

  const raw = await callClaude(
    [{ role: "user", content: prompt }],
    "You are an IELTS vocabulary expert. Return ONLY valid JSON, no markdown fences.",
    400
  );
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return { word, definition: "查询失败，请重试" };
  }
}

export async function getDailyWarmup(day, phase) {
  const prompt = `Generate a short IELTS speaking warm-up for Day ${day} (Phase ${phase}/4 of a 120-day plan).
Return ONLY valid JSON (no markdown):
{
  "quote": "A short motivational quote in English (max 15 words)",
  "tip": "One specific IELTS speaking tip for today (in Chinese, max 40 chars)",
  "tonguetwister": "A short English tongue-twister for pronunciation warm-up",
  "todayFocus": "Today's key improvement area in Chinese (max 10 chars)"
}`;

  const raw = await callClaude([{ role: "user", content: prompt }], "", 300);
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return {
      quote: "Every expert was once a beginner.",
      tip: "回答时尽量用完整句子，避免单词式回答",
      tonguetwister: "She sells seashells by the seashore.",
      todayFocus: "流利度提升",
    };
  }
}
