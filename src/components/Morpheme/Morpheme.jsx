import { useState } from "react";
import { ROOTS, PREFIXES, SUFFIXES, MORPHEME_QUIZZES } from "../../data/morphemes";
import { Card, CardTitle, Btn } from "../ui";

const TABS = [
  { id: "roots",    label: "词根",   icon: "tree",        data: ROOTS },
  { id: "prefixes", label: "前缀",   icon: "arrow-left",  data: PREFIXES },
  { id: "suffixes", label: "后缀",   icon: "arrow-right", data: SUFFIXES },
  { id: "quiz",     label: "练习",   icon: "puzzle",      data: MORPHEME_QUIZZES },
];

const TYPE_COLORS = {
  root:    { bg: "#EEEDFE", color: "#3C3489", border: "#AFA9EC" },
  prefix:  { bg: "#E6F1FB", color: "#0C447C", border: "#85B7EB" },
  suffix:  { bg: "#E1F5EE", color: "#085041", border: "#5DCAA5" },
};

export default function Morpheme() {
  const [tab, setTab]             = useState("roots");
  const [expanded, setExpanded]   = useState(null);
  const [search, setSearch]       = useState("");
  const [quizIdx, setQuizIdx]     = useState(0);
  const [selected, setSelected]   = useState(null);
  const [showAns, setShowAns]     = useState(false);
  const [score, setScore]         = useState({ correct: 0, total: 0 });

  const activeData = TABS.find(t => t.id === tab)?.data || [];

  const filtered = tab === "quiz" ? activeData : activeData.filter(item =>
    !search ||
    item.form.toLowerCase().includes(search.toLowerCase()) ||
    item.meaning.toLowerCase().includes(search.toLowerCase()) ||
    item.words?.some(w => w.word.toLowerCase().includes(search.toLowerCase()))
  );

  function handleQuizAnswer(opt) {
    if (showAns) return;
    setSelected(opt);
    setShowAns(true);
    const correct = opt === MORPHEME_QUIZZES[quizIdx].answer;
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
  }

  function nextQuiz() {
    setQuizIdx(i => (i + 1) % MORPHEME_QUIZZES.length);
    setSelected(null);
    setShowAns(false);
  }

  const q = MORPHEME_QUIZZES[quizIdx];

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>词根词缀</span>
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          {ROOTS.length} 个词根 · {PREFIXES.length} 个前缀 · {SUFFIXES.length} 个后缀
        </span>
        {tab !== "quiz" && (
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索词根或单词..."
            style={{ marginLeft: "auto", padding: "6px 12px", fontSize: 13, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none", width: 180 }}
          />
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: "1rem" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSearch(""); setExpanded(null); }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 18px", border: "none", borderBottom: tab === t.id ? "2px solid #534AB7" : "2px solid transparent", background: "none", color: tab === t.id ? "#534AB7" : "var(--color-text-secondary)", fontSize: 13, fontWeight: tab === t.id ? 500 : 400, cursor: "pointer" }}>
            <i className={`ti ti-${t.icon}`} style={{ fontSize: 14 }} />
            {t.label}
            <span style={{ fontSize: 11, background: tab === t.id ? "#EEEDFE" : "var(--color-background-secondary)", color: tab === t.id ? "#534AB7" : "var(--color-text-tertiary)", padding: "0px 6px", borderRadius: 8, marginLeft: 2 }}>
              {t.data.length}
            </span>
          </button>
        ))}
      </div>

      {/* Quiz tab */}
      {tab === "quiz" && (
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          {/* Score */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              第 {quizIdx + 1} / {MORPHEME_QUIZZES.length} 题
            </span>
            <span style={{ fontSize: 13, color: score.total > 0 ? "#1D9E75" : "var(--color-text-tertiary)" }}>
              {score.total > 0 ? `正确率 ${Math.round((score.correct / score.total) * 100)}%` : "开始答题"}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, background: "var(--color-background-secondary)", borderRadius: 2, overflow: "hidden", marginBottom: "1.5rem" }}>
            <div style={{ height: "100%", width: `${((quizIdx) / MORPHEME_QUIZZES.length) * 100}%`, background: "#534AB7", borderRadius: 2, transition: "width 0.3s" }} />
          </div>

          <Card>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
              {q.question}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: "1rem" }}>
              {q.options.map(opt => {
                const isAnswer = opt === q.answer;
                const isSelected = opt === selected;
                let bg = "var(--color-background-secondary)";
                let border = "var(--color-border-secondary)";
                let color = "var(--color-text-primary)";
                if (showAns) {
                  if (isAnswer) { bg = "#E1F5EE"; border = "#1D9E75"; color = "#085041"; }
                  else if (isSelected && !isAnswer) { bg = "#FCEBEB"; border = "#E24B4A"; color = "#791F1F"; }
                }
                return (
                  <button key={opt} onClick={() => handleQuizAnswer(opt)}
                    style={{ padding: "10px 14px", borderRadius: "var(--border-radius-md)", border: `0.5px solid ${border}`, background: bg, color, fontSize: 13, cursor: showAns ? "default" : "pointer", textAlign: "left", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 8 }}>
                    {showAns && isAnswer && <i className="ti ti-check" style={{ color: "#1D9E75", fontSize: 14 }} />}
                    {showAns && isSelected && !isAnswer && <i className="ti ti-x" style={{ color: "#E24B4A", fontSize: 14 }} />}
                    {opt}
                  </button>
                );
              })}
            </div>

            {showAns && (
              <div style={{ background: "#EEEDFE", borderRadius: "var(--border-radius-md)", padding: "0.75rem", fontSize: 13, color: "#26215C", lineHeight: 1.7, marginBottom: "1rem" }}>
                <i className="ti ti-bulb" style={{ marginRight: 6, color: "#534AB7" }} />
                {q.explanation}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {showAns
                ? <Btn primary onClick={nextQuiz}><i className="ti ti-arrow-right" /> 下一题</Btn>
                : <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>选择一个答案</span>
              }
            </div>
          </Card>
        </div>
      )}

      {/* Root / Prefix / Suffix list */}
      {tab !== "quiz" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-tertiary)", fontSize: 13 }}>
              未找到相关词根词缀
            </div>
          )}
          {filtered.map(item => {
            const isOpen = expanded === item.id;
            const tc = TYPE_COLORS[item.type] || TYPE_COLORS.root;
            return (
              <div key={item.id}
                style={{ background: "var(--color-background-primary)", border: `0.5px solid ${isOpen ? tc.border : "var(--color-border-tertiary)"}`, borderRadius: "var(--border-radius-lg)", overflow: "hidden", transition: "border-color 0.15s" }}>
                {/* Header row */}
                <div onClick={() => setExpanded(isOpen ? null : item.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.9rem 1.25rem", cursor: "pointer" }}>
                  {/* Form badge */}
                  <span style={{ fontSize: 16, fontWeight: 500, padding: "3px 12px", borderRadius: 8, background: tc.bg, color: tc.color, fontFamily: "var(--font-mono)", minWidth: 80, textAlign: "center", flexShrink: 0 }}>
                    {item.form}
                  </span>
                  {/* Meaning */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{item.meaning}</div>
                    {item.origin && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>来源：{item.origin} · {item.words?.length} 个例词</div>}
                    {item.pos && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>词性：{item.pos}</div>}
                  </div>
                  {/* Preview words */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 200, justifyContent: "flex-end" }}>
                    {item.words?.slice(0, 3).map(w => (
                      <span key={w.word} style={{ fontSize: 11, padding: "1px 7px", borderRadius: 8, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)" }}>
                        {w.word}
                      </span>
                    ))}
                  </div>
                  <i className={`ti ti-chevron-${isOpen ? "up" : "down"}`} style={{ fontSize: 16, color: "var(--color-text-tertiary)", flexShrink: 0 }} />
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ borderTop: `0.5px solid ${tc.border}`, background: tc.bg + "44", padding: "1rem 1.25rem" }}>
                    {/* Tip */}
                    {item.tip && (
                      <div style={{ fontSize: 12, color: tc.color, background: tc.bg, borderRadius: "var(--border-radius-md)", padding: "0.5rem 0.75rem", marginBottom: "0.75rem", display: "flex", alignItems: "flex-start", gap: 6 }}>
                        <i className="ti ti-bulb" style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }} />
                        {item.tip}
                      </div>
                    )}
                    {/* Words grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
                      {item.words?.map(w => (
                        <div key={w.word} style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-md)", padding: "0.6rem 0.75rem", border: "0.5px solid var(--color-border-tertiary)" }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{w.word}</span>
                            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{w.def}</span>
                          </div>
                          {w.breakdown && (
                            <div style={{ fontSize: 11, color: tc.color, fontFamily: "var(--font-mono)" }}>
                              {w.breakdown}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
