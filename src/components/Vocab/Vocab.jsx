import { useState, useEffect } from "react";
import { useStore } from "../../store";
import { sm2, getDueCards, createCard } from "../../utils/sm2";
import { ROOTS, PREFIXES, SUFFIXES } from "../../data/morphemes";
import { speak, ttsSupported, stopSpeaking } from "../../utils/tts";
import { callClaude } from "../../utils/api";
import { Card, CardTitle, MetricCard, Btn, ProgressBar, Spinner } from "../ui";

const RATING_BTNS = [
  { rating: 1, label: "不记得", sub: "1天后", bg: "#E24B4A", color: "#fff" },
  { rating: 3, label: "模糊",   sub: "3天后", bg: "var(--color-background-secondary)", color: "#185FA5", border: "#185FA5" },
  { rating: 5, label: "记住了", sub: "7天+",  bg: "#1D9E75", color: "#fff" },
];

const SEED_CARDS = [
  { word: "burgeoning",    phonetic: "/ˈbɜːdʒənɪŋ/",           definition: "（形）迅速增长的，蓬勃发展的", example: "The burgeoning tech industry created thousands of new jobs.",        synonyms: "flourishing, thriving, expanding" },
  { word: "ramification",  phonetic: "/ˌræmɪfɪˈkeɪʃ(ə)n/",    definition: "（名）后果，影响；分支",       example: "The ramifications of the policy were felt across the country.",   synonyms: "consequence, implication, outcome" },
  { word: "salient",       phonetic: "/ˈseɪliənt/",             definition: "（形）最重要的，最显著的",     example: "The most salient feature of the report is its clarity.",         synonyms: "notable, prominent, striking" },
  { word: "recirculation", phonetic: "/ˌriːˌsɜːkjʊˈleɪʃ(ə)n/",definition: "（名）再循环，循环利用",       example: "Water recirculation reduces waste significantly.",                synonyms: "recycling, reuse, circulation" },
  { word: "impediment",    phonetic: "/ɪmˈpedɪmənt/",           definition: "（名）障碍，阻碍",             example: "Lack of funding is the main impediment to progress.",            synonyms: "obstacle, barrier, hindrance" },
  { word: "substantial",   phonetic: "/səbˈstænʃ(ə)l/",         definition: "（形）大量的；实质性的",       example: "There has been a substantial increase in applications.",         synonyms: "considerable, significant, notable" },
  { word: "proliferate",   phonetic: "/prəˈlɪfəreɪt/",          definition: "（动）激增，扩散",             example: "Social media platforms continue to proliferate.",                synonyms: "multiply, expand, spread rapidly" },
  { word: "mitigate",      phonetic: "/ˈmɪtɪɡeɪt/",             definition: "（动）减轻，缓和",             example: "Governments must act to mitigate the effects of climate change.", synonyms: "alleviate, reduce, lessen" },
  { word: "exacerbate",    phonetic: "/ɪɡˈzæsəbeɪt/",           definition: "（动）加剧，使恶化",           example: "The drought was exacerbated by deforestation.",                  synonyms: "worsen, aggravate, intensify" },
  { word: "disparity",     phonetic: "/dɪˈspærɪti/",            definition: "（名）差距，悬殊",             example: "There is a growing disparity between rich and poor.",            synonyms: "inequality, gap, difference" },
];

const ALL_MORPHEMES = [...ROOTS, ...PREFIXES, ...SUFFIXES];

// 从词根数据库里找到这个单词所属的词根/前缀/后缀
function findMorphemes(word) {
  return ALL_MORPHEMES.filter(m =>
    m.words?.some(w => w.word.toLowerCase() === word.toLowerCase())
  );
}

// 拆解单词：找到匹配的词根并高亮
function buildBreakdown(word) {
  const morphemes = findMorphemes(word);
  if (!morphemes.length) return null;
  // 从词根的例词中找 breakdown 字段
  for (const m of morphemes) {
    const entry = m.words?.find(w => w.word.toLowerCase() === word.toLowerCase());
    if (entry?.breakdown) return entry.breakdown;
  }
  return null;
}

function pronounce(text, rate = 0.88) {
  if (!ttsSupported()) return;
  stopSpeaking();
  speak(text, { rate });
}

// ── AI 造句 ──────────────────────────────────────────────────────────────────
async function generateSentences(word, definition) {
  const prompt = `Generate exactly 3 IELTS-level example sentences using the word "${word}" (${definition}).

Return ONLY valid JSON array, no markdown:
[
  {
    "scene": "学术写作",
    "sentence": "...",
    "translation": "中文翻译",
    "highlight": "${word}"
  },
  {
    "scene": "阅读理解",
    "sentence": "...",
    "translation": "中文翻译",
    "highlight": "${word}"
  },
  {
    "scene": "口语表达",
    "sentence": "...",
    "translation": "中文翻译",
    "highlight": "${word}"
  }
]

Rules:
- 学术写作: formal academic style, Band 7+ vocabulary, suitable for IELTS Writing Task 2
- 阅读理解: complex sentence structure typical of IELTS Reading passages, academic topic
- 口语表达: natural spoken English, suitable for IELTS Speaking Part 3 discussion
- Each sentence must use "${word}" naturally in context
- Vary the topics: environment, technology, education, society, economy`;

  const raw = await callClaude([{ role: "user", content: prompt }], "", 600);
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return null;
  }
}

// ── AI 例句面板 ───────────────────────────────────────────────────────────────
function SentencesPanel({ sentences, loading, word, onGenerate }) {
  const SCENE_STYLE = {
    "学术写作": { bg: "#EEEDFE", color: "#3C3489", border: "#AFA9EC", icon: "writing" },
    "阅读理解": { bg: "#E6F1FB", color: "#0C447C", border: "#85B7EB", icon: "book" },
    "口语表达": { bg: "#E1F5EE", color: "#085041", border: "#5DCAA5", icon: "microphone" },
  };

  // 高亮单词函数
  function highlight(sentence, word) {
    if (!word || !sentence) return sentence;
    const regex = new RegExp(`(${word}[a-z]*)`, "gi");
    const parts = sentence.split(regex);
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} style={{ background: "#FFF3B0", color: "#633806", borderRadius: 3, padding: "0 2px", fontWeight: 500 }}>{part}</mark>
        : part
    );
  }

  return (
    <div style={{ margin: "0.75rem 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.6rem" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>
          <i className="ti ti-sparkles" style={{ marginRight: 5, color: "#534AB7" }} />AI 场景例句
        </span>
        {!sentences && !loading && (
          <Btn small onClick={onGenerate}>
            <i className="ti ti-refresh" /> 生成例句
          </Btn>
        )}
        {sentences && (
          <button onClick={onGenerate}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--color-text-tertiary)", display: "flex", alignItems: "center", gap: 4 }}>
            <i className="ti ti-refresh" style={{ fontSize: 13 }} /> 换一组
          </button>
        )}
      </div>

      {loading && (
        <div style={{ padding: "1rem", display: "flex", alignItems: "center", gap: 8, background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)" }}>
          <Spinner />
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>AI 正在生成场景例句...</span>
        </div>
      )}

      {sentences && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sentences.map((s, i) => {
            const style = SCENE_STYLE[s.scene] || SCENE_STYLE["学术写作"];
            return (
              <div key={i} style={{ border: `0.5px solid ${style.border}`, borderRadius: "var(--border-radius-md)", overflow: "hidden" }}>
                {/* 场景标签 */}
                <div style={{ background: style.bg, padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className={`ti ti-${style.icon}`} style={{ fontSize: 13, color: style.color }} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: style.color }}>{s.scene}</span>
                  <button
                    onClick={() => speak(s.sentence, { rate: 0.85 })}
                    style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: style.color, fontSize: 13 }}
                    aria-label="朗读例句">
                    <i className="ti ti-volume" />
                  </button>
                </div>
                {/* 例句 */}
                <div style={{ padding: "0.6rem 0.75rem", background: "var(--color-background-primary)" }}>
                  <div style={{ fontSize: 13.5, color: "var(--color-text-primary)", lineHeight: 1.7, marginBottom: 5 }}>
                    {highlight(s.sentence, word)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                    {s.translation}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 词根词缀展示面板 ──────────────────────────────────────────────────────────
function MorphemePanel({ word }) {
  const morphemes = findMorphemes(word);
  const breakdown = buildBreakdown(word);

  if (!morphemes.length) return (
    <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center", padding: "0.5rem" }}>
      暂无词根数据
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* 拆解公式 */}
      {breakdown && (
        <div style={{ textAlign: "center", fontSize: 13, color: "#3C3489", background: "#EEEDFE", borderRadius: "var(--border-radius-md)", padding: "0.5rem 1rem", fontFamily: "monospace" }}>
          {breakdown}
        </div>
      )}

      {/* 每个词根/前缀/后缀 */}
      {morphemes.map(m => {
        const typeColor = {
          root:    { bg: "#EEEDFE", color: "#3C3489", border: "#AFA9EC", label: "词根" },
          prefix:  { bg: "#E6F1FB", color: "#0C447C", border: "#85B7EB", label: "前缀" },
          suffix:  { bg: "#E1F5EE", color: "#085041", border: "#5DCAA5", label: "后缀" },
        }[m.type] || { bg: "#EEEDFE", color: "#3C3489", border: "#AFA9EC", label: "词根" };

        const familyWords = m.words?.filter(w => w.word.toLowerCase() !== word.toLowerCase()) || [];

        return (
          <div key={m.id} style={{ border: `0.5px solid ${typeColor.border}`, borderRadius: "var(--border-radius-md)", overflow: "hidden" }}>
            {/* 词根头部 */}
            <div style={{ background: typeColor.bg, padding: "0.6rem 0.75rem", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 6, background: "rgba(0,0,0,0.08)", color: typeColor.color }}>{typeColor.label}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: typeColor.color, fontFamily: "monospace" }}>{m.form}</span>
              <span style={{ fontSize: 13, color: typeColor.color }}>{m.meaning}</span>
              {m.tip && (
                <span style={{ marginLeft: "auto", fontSize: 11, color: typeColor.color, opacity: 0.8 }}>
                  <i className="ti ti-bulb" style={{ marginRight: 3 }} />{m.tip}
                </span>
              )}
            </div>
            {/* 同族词 */}
            <div style={{ padding: "0.5rem 0.75rem", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {familyWords.slice(0, 6).map(w => (
                <div key={w.word}
                  onClick={() => pronounce(w.word)}
                  title={w.def}
                  style={{ fontSize: 12, padding: "3px 10px", borderRadius: 8, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", cursor: "pointer", border: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", gap: 5 }}>
                  <i className="ti ti-volume" style={{ fontSize: 11, color: "#534AB7" }} />
                  <span>{w.word}</span>
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>— {w.def}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 词根浏览面板（内嵌在同页面） ─────────────────────────────────────────────
function MorphemeBrowser() {
  const [activeType, setActiveType] = useState("root");
  const [expanded, setExpanded]     = useState(null);
  const [search, setSearch]         = useState("");
  const [quizIdx, setQuizIdx]       = useState(0);
  const [selected, setSelected]     = useState(null);
  const [showAns, setShowAns]       = useState(false);
  const [score, setScore]           = useState({ correct: 0, total: 0 });

  const QUIZZES = [
    { q: "transport 中哪个部分表示'携带'？", options: ["trans", "port", "tion", "sport"], answer: "port", exp: "port 来自拉丁语 portare（携带）。trans 是前缀（穿越），-sport 不是词根。" },
    { q: "inter- 前缀的意思是？",            options: ["在内部", "在之间", "反对", "超过"],   answer: "在之间", exp: "inter- = between，如 international（国际的）= inter（国与国之间）+ nation + al。" },
    { q: "-tion 后缀通常把词变成什么词性？",  options: ["动词", "形容词", "名词", "副词"],    answer: "名词",   exp: "-tion/-sion 是名词后缀，如 pollution、education、population。" },
    { q: "script 词根的含义是？",            options: ["说话", "写", "看", "走"],           answer: "写",     exp: "script 来自拉丁语 scribere（写），manuscript = manu（手）+ script（写）= 手稿。" },
    { q: "前缀 re- 表示什么意思？",          options: ["向前", "反对", "再次/回", "在下面"], answer: "再次/回", exp: "re- = again / back，如 recycle（再循环）、review（再看=复习）、reduce（往回缩=减少）。" },
    { q: "spec/spect 词根的含义是？",        options: ["说", "看", "走", "做"],             answer: "看",     exp: "spect = look/see，inspect（向内看=检查），respect（再次看=尊重），spectator（观众）。" },
    { q: "前缀 pro- 表示什么？",             options: ["反对", "向前/支持", "在下面", "穿越"], answer: "向前/支持", exp: "pro- = forward / for，progress（向前走=进步），promote（向前推=促进）。" },
    { q: "-able/-ible 后缀表示什么？",       options: ["的人", "能够/值得", "行为结果", "方式"], answer: "能够/值得", exp: "-able/-ible 是形容词后缀，如 sustainable（能持续的），flexible（能弯曲的=灵活的）。" },
  ];

  const data = activeType === "root" ? ROOTS : activeType === "prefix" ? PREFIXES : SUFFIXES;
  const filtered = data.filter(m =>
    !search ||
    m.form.toLowerCase().includes(search.toLowerCase()) ||
    m.meaning.toLowerCase().includes(search.toLowerCase()) ||
    m.words?.some(w => w.word.toLowerCase().includes(search.toLowerCase()))
  );

  const typeColor = {
    root:   { bg: "#EEEDFE", color: "#3C3489", border: "#AFA9EC" },
    prefix: { bg: "#E6F1FB", color: "#0C447C", border: "#85B7EB" },
    suffix: { bg: "#E1F5EE", color: "#085041", border: "#5DCAA5" },
  };

  const q = QUIZZES[quizIdx % QUIZZES.length];

  function handleAnswer(opt) {
    if (showAns) return;
    setSelected(opt);
    setShowAns(true);
    setScore(s => ({ correct: s.correct + (opt === q.answer ? 1 : 0), total: s.total + 1 }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* 类型切换 + 搜索 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {[
          { id: "root",   label: `词根 ${ROOTS.length}`,    bg: typeColor.root.bg,   color: typeColor.root.color },
          { id: "prefix", label: `前缀 ${PREFIXES.length}`, bg: typeColor.prefix.bg, color: typeColor.prefix.color },
          { id: "suffix", label: `后缀 ${SUFFIXES.length}`, bg: typeColor.suffix.bg, color: typeColor.suffix.color },
          { id: "quiz",   label: "练习",                    bg: "#FAEEDA",           color: "#633806" },
        ].map(t => (
          <button key={t.id} onClick={() => { setActiveType(t.id); setSearch(""); setExpanded(null); }}
            style={{ padding: "5px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: activeType === t.id ? t.bg : "var(--color-background-secondary)", color: activeType === t.id ? t.color : "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", fontWeight: activeType === t.id ? 500 : 400 }}>
            {t.label}
          </button>
        ))}
        {activeType !== "quiz" && (
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索..."
            style={{ marginLeft: "auto", padding: "5px 10px", fontSize: 12, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none", width: 160 }} />
        )}
      </div>

      {/* 练习 */}
      {activeType === "quiz" && (
        <Card style={{ marginBottom: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
            <span>第 {(quizIdx % QUIZZES.length) + 1} / {QUIZZES.length} 题</span>
            {score.total > 0 && <span style={{ color: "#1D9E75" }}>正确率 {Math.round(score.correct / score.total * 100)}%</span>}
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "1.25rem", lineHeight: 1.6 }}>{q.q}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: "1rem" }}>
            {q.options.map(opt => {
              const isRight = opt === q.answer;
              const isPicked = opt === selected;
              let bg = "var(--color-background-secondary)", border = "var(--color-border-secondary)", color = "var(--color-text-primary)";
              if (showAns) {
                if (isRight)               { bg = "#E1F5EE"; border = "#1D9E75"; color = "#085041"; }
                else if (isPicked)         { bg = "#FCEBEB"; border = "#E24B4A"; color = "#791F1F"; }
              }
              return (
                <button key={opt} onClick={() => handleAnswer(opt)}
                  style={{ padding: "9px 12px", borderRadius: "var(--border-radius-md)", border: `0.5px solid ${border}`, background: bg, color, fontSize: 13, cursor: showAns ? "default" : "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}>
                  {showAns && isRight  && <i className="ti ti-check" style={{ color: "#1D9E75" }} />}
                  {showAns && isPicked && !isRight && <i className="ti ti-x" style={{ color: "#E24B4A" }} />}
                  {opt}
                </button>
              );
            })}
          </div>
          {showAns && (
            <div style={{ background: "#EEEDFE", borderRadius: "var(--border-radius-md)", padding: "0.65rem 0.75rem", fontSize: 12, color: "#26215C", lineHeight: 1.7, marginBottom: "0.75rem" }}>
              <i className="ti ti-bulb" style={{ marginRight: 5, color: "#534AB7" }} />{q.exp}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            {showAns
              ? <Btn primary onClick={() => { setQuizIdx(i => i + 1); setSelected(null); setShowAns(false); }}>
                  下一题 <i className="ti ti-arrow-right" />
                </Btn>
              : <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>选择答案</span>}
          </div>
        </Card>
      )}

      {/* 词根/前缀/后缀列表 */}
      {activeType !== "quiz" && filtered.map(m => {
        const tc = typeColor[m.type] || typeColor.root;
        const isOpen = expanded === m.id;
        return (
          <div key={m.id} style={{ border: `0.5px solid ${isOpen ? tc.border : "var(--color-border-tertiary)"}`, borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
            <div onClick={() => setExpanded(isOpen ? null : m.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.85rem 1rem", cursor: "pointer", background: "var(--color-background-primary)" }}>
              <span style={{ fontSize: 14, fontWeight: 500, fontFamily: "monospace", padding: "2px 12px", borderRadius: 8, background: tc.bg, color: tc.color, minWidth: 80, textAlign: "center", flexShrink: 0 }}>{m.form}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{m.meaning}</div>
                {m.origin && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>来源：{m.origin}</div>}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 220, justifyContent: "flex-end" }}>
                {m.words?.slice(0, 3).map(w => (
                  <span key={w.word} style={{ fontSize: 11, padding: "1px 7px", borderRadius: 8, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)" }}>{w.word}</span>
                ))}
              </div>
              <i className={`ti ti-chevron-${isOpen ? "up" : "down"}`} style={{ fontSize: 15, color: "var(--color-text-tertiary)", flexShrink: 0 }} />
            </div>
            {isOpen && (
              <div style={{ borderTop: `0.5px solid ${tc.border}`, background: tc.bg + "33", padding: "0.75rem 1rem" }}>
                {m.tip && (
                  <div style={{ fontSize: 12, color: tc.color, marginBottom: "0.65rem", display: "flex", gap: 6 }}>
                    <i className="ti ti-bulb" style={{ flexShrink: 0, marginTop: 1 }} />{m.tip}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 6 }}>
                  {m.words?.map(w => (
                    <div key={w.word} onClick={() => pronounce(w.word)}
                      style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-md)", padding: "0.5rem 0.75rem", border: "0.5px solid var(--color-border-tertiary)", cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <i className="ti ti-volume" style={{ fontSize: 12, color: "#534AB7" }} />
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{w.word}</span>
                        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{w.def}</span>
                      </div>
                      {w.breakdown && <div style={{ fontSize: 11, color: tc.color, fontFamily: "monospace", marginTop: 3 }}>{w.breakdown}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function Vocab() {
  const { state, dispatch } = useStore();
  const [revealed, setRevealed]   = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [addWord, setAddWord]     = useState("");
  const [addDef, setAddDef]       = useState("");
  const [autoPlay, setAutoPlay]   = useState(true);
  const [tab, setTab]             = useState("review");

  const allCards    = state.vocabCards.length === 0
    ? SEED_CARDS.map(s => createCard(s.word, s.definition, "内置词库"))
    : state.vocabCards;
  const dueCards    = getDueCards(allCards);
  const currentCard = dueCards[cardIndex % Math.max(dueCards.length, 1)];
  const seedMeta    = SEED_CARDS.find(s => s.word === currentCard?.word);
  const mastered    = allCards.filter(c => c.reps >= 3).length;
  const doneCount   = cardIndex % (dueCards.length + 1);

  // AI 例句状态
  const [sentences, setSentences]         = useState(null);
  const [loadingSentences, setLoadingSentences] = useState(false);
  const [sentenceWord, setSentenceWord]   = useState(""); // 记录是哪个词生成的，避免重复请求

  useEffect(() => {
    if (autoPlay && currentCard?.word && ttsSupported()) {
      setTimeout(() => pronounce(currentCard.word), 400);
    }
    // 切换卡片时清空例句
    setSentences(null);
    setSentenceWord("");
  }, [cardIndex, currentCard?.word]);

  function rate(rating) {
    if (!currentCard) return;
    dispatch({ type: "UPDATE_VOCAB_CARD", card: sm2(currentCard, rating) });
    setRevealed(false);
    const next = (cardIndex + 1) % Math.max(dueCards.length, 1);
    setCardIndex(next);
    if (next === 0) dispatch({ type: "COMPLETE_TASK", id: "vocab_review" });
  }

  async function fetchSentences() {
    if (!currentCard || loadingSentences || sentenceWord === currentCard.word) return;
    setLoadingSentences(true);
    setSentenceWord(currentCard.word);
    const result = await generateSentences(currentCard.word, currentCard.definition);
    setSentences(result);
    setLoadingSentences(false);
  }

  function addManual() {
    if (!addWord.trim() || !addDef.trim()) return;
    dispatch({ type: "ADD_VOCAB_CARDS", cards: [createCard(addWord.trim(), addDef.trim(), "手动添加")] });
    setAddWord(""); setAddDef("");
  }

  const TABS = [
    { id: "review",   label: "复习卡片",  icon: "cards" },
    { id: "morpheme", label: "词根词缀",  icon: "tree" },
    { id: "list",     label: "全部词库",  icon: "list" },
  ];

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>词汇学习</span>
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          待复习 {dueCards.length} 张 · 已掌握 {mastered} 词
        </span>
        {ttsSupported() && (
          <button onClick={() => setAutoPlay(v => !v)} title={autoPlay ? "关闭自动朗读" : "开启自动朗读"}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: autoPlay ? "#534AB7" : "var(--color-text-tertiary)" }}>
            <i className={`ti ti-volume${autoPlay ? "" : "-off"}`} />
          </button>
        )}
        <div style={{ marginLeft: "auto", width: 120 }}>
          <ProgressBar value={doneCount} max={Math.max(dueCards.length, 1)} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: "1rem" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 18px", border: "none", borderBottom: tab === t.id ? "2px solid #534AB7" : "2px solid transparent", background: "none", color: tab === t.id ? "#534AB7" : "var(--color-text-secondary)", fontSize: 13, fontWeight: tab === t.id ? 500 : 400, cursor: "pointer" }}>
            <i className={`ti ti-${t.icon}`} style={{ fontSize: 14 }} />{t.label}
          </button>
        ))}
      </div>

      {/* ── 复习卡片 ── */}
      {tab === "review" && (
        <>
          {dueCards.length === 0 ? (
            <Card style={{ textAlign: "center", padding: "2.5rem" }}>
              <i className="ti ti-circle-check" style={{ fontSize: 48, color: "#1D9E75" }} />
              <div style={{ fontSize: 16, fontWeight: 500, margin: "1rem 0 0.5rem", color: "var(--color-text-primary)" }}>今日全部复习完毕！</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>去阅读模块收集新生词，或浏览词根词缀</div>
            </Card>
          ) : (
            /* 两栏布局：左=卡片，右=词根分析 */
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1rem", alignItems: "start" }}>
              {/* 左：记忆卡 */}
              <Card style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: "1rem" }}>
                  <span>来源：{currentCard?.source || "词库"}</span>
                  <span>{doneCount + 1} / {dueCards.length}</span>
                </div>

                {/* 单词 + 朗读 */}
                <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 38, fontWeight: 500, color: "var(--color-text-primary)" }}>
                      {currentCard?.word}
                    </span>
                    <button onClick={() => pronounce(currentCard.word)}
                      style={{ width: 34, height: 34, borderRadius: "50%", background: "#EEEDFE", border: "none", cursor: "pointer", color: "#534AB7", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                      aria-label="朗读">
                      <i className="ti ti-volume" />
                    </button>
                  </div>
                  {(currentCard?.phonetic || seedMeta?.phonetic) && (
                    <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 4 }}>
                      {currentCard?.phonetic || seedMeta?.phonetic}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: "1.25rem" }}>
                  这个词的意思是什么？
                </div>

                {!revealed ? (
                  <div style={{ textAlign: "center" }}>
                    <Btn primary onClick={() => { setRevealed(true); pronounce(currentCard.word); }}>
                      <i className="ti ti-eye" /> 显示释义
                    </Btn>
                  </div>
                ) : (
                  <>
                    <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", padding: "1rem 0" }}>
                      <div style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)", textAlign: "center", marginBottom: "0.75rem" }}>
                        {currentCard?.definition}
                      </div>
                      {seedMeta?.example && (
                        <div onClick={() => speak(seedMeta.example, { rate: 0.82 })}
                          style={{ fontSize: 13, color: "var(--color-text-secondary)", fontStyle: "italic", lineHeight: 1.8, background: "var(--color-background-secondary)", padding: "0.6rem 0.75rem", borderRadius: "var(--border-radius-md)", cursor: "pointer", marginBottom: "0.5rem" }}>
                          <i className="ti ti-volume" style={{ fontSize: 12, marginRight: 6, color: "#534AB7" }} />
                          {seedMeta.example}
                        </div>
                      )}
                      {seedMeta?.synonyms && (
                        <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center" }}>
                          近义词：{seedMeta.synonyms}
                        </div>
                      )}
                    </div>

                    {/* AI 例句区 */}
                    <SentencesPanel
                      sentences={sentences}
                      loading={loadingSentences}
                      word={currentCard?.word}
                      onGenerate={fetchSentences}
                    />

                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", textAlign: "center", marginBottom: "0.75rem" }}>记忆程度如何？</div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                      {RATING_BTNS.map(({ rating, label, sub, bg, color, border }) => (
                        <button key={rating} onClick={() => rate(rating)}
                          style={{ padding: "8px 18px", borderRadius: "var(--border-radius-md)", border: `0.5px solid ${border || bg}`, background: bg, color, cursor: "pointer", fontSize: 13, minWidth: 76 }}>
                          {label}<div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{sub}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </Card>

              {/* 右：词根词缀分析 */}
              <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="ti ti-tree" style={{ color: "#534AB7" }} />词根拆解
                </div>
                <MorphemePanel word={currentCard?.word || ""} />
              </div>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, margin: "1rem 0" }}>
            <MetricCard label="词库总量"   value={allCards.length}                sub={`已掌握 ${mastered} 词`} />
            <MetricCard label="今日待复习" value={dueCards.length}                sub="张卡片" />
            <MetricCard label="连续打卡"   value={`${state.vocabStreak || 1} 天`} sub="保持下去！" />
          </div>

          <Card>
            <CardTitle icon="plus">手动添加单词</CardTitle>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input value={addWord} onChange={e => setAddWord(e.target.value)} placeholder="单词（英文）"
                style={{ flex: "1 1 120px", padding: "7px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, outline: "none" }} />
              <input value={addDef} onChange={e => setAddDef(e.target.value)} placeholder="中文释义"
                style={{ flex: "2 1 200px", padding: "7px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, outline: "none" }} />
              <Btn primary onClick={addManual} disabled={!addWord.trim() || !addDef.trim()}>
                <i className="ti ti-plus" /> 添加
              </Btn>
            </div>
          </Card>
        </>
      )}

      {/* ── 词根词缀浏览 ── */}
      {tab === "morpheme" && <MorphemeBrowser />}

      {/* ── 全部词库 ── */}
      {tab === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {allCards.length === 0 && (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-tertiary)", fontSize: 13 }}>
              词库为空，从阅读模块添加生词
            </div>
          )}
          {allCards.map(card => {
            const meta = SEED_CARDS.find(s => s.word === card.word);
            return (
              <div key={card.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 1rem", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)" }}>
                <button onClick={() => pronounce(card.word)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#534AB7", fontSize: 18, padding: 0, flexShrink: 0 }}>
                  <i className="ti ti-volume" />
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{card.word}</span>
                    {meta?.phonetic && <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{meta.phonetic}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{card.definition}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: card.reps >= 3 ? "#1D9E75" : "var(--color-text-tertiary)" }}>
                    {card.reps >= 3 ? "已掌握" : `复习 ${card.reps} 次`}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>下次：{card.due || "今天"}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
