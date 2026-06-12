import { useState, useRef, useEffect } from "react";
import { useStore } from "../../store";
import { callClaude } from "../../utils/api";
import { getPhase } from "../../utils/tasks";
import { WRITING_TASK1, WRITING_TASK2 } from "../../data/questionBank";
import { Card, CardTitle, MetricCard, Btn, Spinner, ProgressBar } from "../ui";



const TABS = ["Task 1 — 图表描述", "Task 2 — 议论文"];

async function scoreWriting(essay, prompt, taskType) {
  const system = `You are a senior IELTS examiner with 15 years of experience marking writing. 
Score strictly against official IELTS Writing Band Descriptors. Return ONLY valid JSON, no markdown.`;

  const criteria = taskType === "Task 1"
    ? ["taskAchievement", "coherenceCohesion", "lexicalResource", "grammaticalRange"]
    : ["taskResponse", "coherenceCohesion", "lexicalResource", "grammaticalRange"];

  const criteriaJson = criteria.map(c => `"${c}": { "score": 5.0, "comment": "...", "tip": "..." }`).join(",\n  ");

  const p = `Score this IELTS ${taskType} essay. Return ONLY this JSON:
{
  "overall": 5.0,
  "wordCount": ${essay.trim().split(/\s+/).length},
  ${criteriaJson},
  "strongPoints": ["point 1", "point 2"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "rewrittenIntro": "A rewritten, improved version of their opening paragraph"
}

Question: ${prompt}

Essay:
${essay}`;

  const raw = await callClaude([{ role: "user", content: p }], system, 1200);
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return null;
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Writing() {
  const { state, dispatch } = useStore();
  const phase = getPhase(state.currentDay);

  const [tab, setTab] = useState(0);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [essay, setEssay] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [scoring, setScoring] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const intervalRef = useRef(null);

  const prompts = tab === 0 ? WRITING_TASK1 : WRITING_TASK2;
  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const minWords = tab === 0 ? 150 : 250;
  const sessions = state.writingSessions || [];

  // Timer
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setTimerRunning(false);
            setTimerFinished(true);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerRunning]);

  function selectPrompt(p) {
    setSelectedPrompt(p);
    setEssay("");
    setFeedback(null);
    setTimerFinished(false);
    setTimerRunning(false);
    setTimeLeft(p.timeLimit * 60);
    clearInterval(intervalRef.current);
  }

  function startTimer() {
    setTimerRunning(true);
    setTimerFinished(false);
  }

  function pauseTimer() {
    clearInterval(intervalRef.current);
    setTimerRunning(false);
  }

  async function handleScore() {
    if (!essay.trim() || !selectedPrompt) return;
    setScoring(true);
    setFeedback(null);
    const result = await scoreWriting(essay, selectedPrompt.prompt, selectedPrompt.type);
    setFeedback(result);
    setScoring(false);
    if (result) {
      dispatch({
        type: "ADD_WRITING_SESSION",
        session: {
          date: new Date().toISOString().split("T")[0],
          taskType: selectedPrompt.type,
          title: selectedPrompt.title,
          wordCount,
          score: result.overall,
        },
      });
      dispatch({ type: "COMPLETE_TASK", id: "writing_practice" });
    }
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const urgent = timeLeft < 300 && timeLeft > 0;

  const DIM_COLORS = {
    taskAchievement: "#534AB7", taskResponse: "#534AB7",
    coherenceCohesion: "#185FA5", lexicalResource: "#1D9E75", grammaticalRange: "#BA7517",
  };
  const DIM_LABELS = {
    taskAchievement: "Task Achievement",
    taskResponse: "Task Response",
    coherenceCohesion: "Coherence & Cohesion",
    lexicalResource: "Lexical Resource",
    grammaticalRange: "Grammatical Range",
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>写作练习</span>
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          Task 1 — 150词 · 20分钟 &nbsp;|&nbsp; Task 2 — 250词 · 40分钟
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <MetricStats sessions={sessions} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: "1rem", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => { setTab(i); setSelectedPrompt(null); setFeedback(null); setEssay(""); }}
            style={{
              padding: "8px 20px", border: "none", borderBottom: tab === i ? "2px solid #534AB7" : "2px solid transparent",
              background: "none", color: tab === i ? "#534AB7" : "var(--color-text-secondary)",
              fontSize: 13, fontWeight: tab === i ? 500 : 400, cursor: "pointer",
            }}>
            {t}
          </button>
        ))}
      </div>

      {!selectedPrompt ? (
        /* Prompt selection */
        <div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: "0.75rem" }}>
            选择一道题目开始练习：
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {prompts.map(p => (
              <div key={p.id} onClick={() => selectPrompt(p)}
                style={{
                  background: "var(--color-background-primary)",
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: "var(--border-radius-lg)",
                  padding: "1rem 1.25rem",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#534AB7"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border-tertiary)"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, background: "#EEEDFE", color: "#3C3489", padding: "2px 8px", borderRadius: 8 }}>{p.type}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{p.title}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-text-tertiary)" }}>
                    <i className="ti ti-clock" style={{ marginRight: 3 }} />{p.timeLimit} 分钟
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>{p.prompt}</div>
              </div>
            ))}
          </div>

          {/* Recent sessions */}
          {sessions.length > 0 && (
            <Card style={{ marginTop: "1rem" }}>
              <CardTitle icon="history">最近写作记录</CardTitle>
              {sessions.slice(0, 5).map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, padding: "6px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <span style={{ color: "var(--color-text-tertiary)", minWidth: 80 }}>{s.date}</span>
                  <span style={{ color: "var(--color-text-secondary)", flex: 1 }}>{s.taskType} · {s.title}</span>
                  <span style={{ color: "var(--color-text-tertiary)", fontSize: 12 }}>{s.wordCount} 词</span>
                  {s.score && <span style={{ fontWeight: 500, color: "#534AB7" }}>{s.score}</span>}
                </div>
              ))}
            </Card>
          )}
        </div>
      ) : (
        /* Writing editor */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {/* Prompt card */}
            <Card style={{ marginBottom: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.5rem" }}>
                <span style={{ fontSize: 12, background: "#EEEDFE", color: "#3C3489", padding: "2px 8px", borderRadius: 8 }}>{selectedPrompt.type}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{selectedPrompt.title}</span>
                <button onClick={() => setSelectedPrompt(null)}
                  style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 13 }}>
                  <i className="ti ti-arrow-left" /> 换题
                </button>
              </div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.8 }}>{selectedPrompt.prompt}</div>
              {selectedPrompt.imageDesc && (
                <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.75rem", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
                  <i className="ti ti-chart-bar" style={{ marginRight: 6, color: "#534AB7" }} />
                  <strong>图表数据：</strong>{selectedPrompt.imageDesc}
                </div>
              )}
            </Card>

            {/* Timer bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "0.6rem 1rem" }}>
              <i className="ti ti-clock" style={{ fontSize: 18, color: urgent ? "#E24B4A" : "#534AB7" }} />
              <span style={{ fontSize: 24, fontWeight: 500, color: urgent ? "#E24B4A" : "var(--color-text-primary)", fontVariantNumeric: "tabular-nums", minWidth: 70 }}>
                {fmt(timeLeft)}
              </span>
              {timerFinished && <span style={{ fontSize: 12, color: "#E24B4A" }}>时间到！</span>}
              <div style={{ flex: 1 }}>
                <ProgressBar
                  value={selectedPrompt.timeLimit * 60 - timeLeft}
                  max={selectedPrompt.timeLimit * 60}
                  color={urgent ? "#E24B4A" : "#534AB7"}
                  height={4}
                />
              </div>
              <Btn small onClick={timerRunning ? pauseTimer : startTimer} primary={!timerRunning}>
                <i className={`ti ti-player-${timerRunning ? "pause" : "play"}`} />
                {timerRunning ? "暂停" : timeLeft === selectedPrompt.timeLimit * 60 ? "开始计时" : "继续"}
              </Btn>
            </div>

            {/* Essay textarea */}
            <div style={{ position: "relative" }}>
              <textarea
                value={essay}
                onChange={e => setEssay(e.target.value)}
                placeholder={tab === 0
                  ? "The graph shows...\n\nOverall, it is clear that...\n\nIn terms of..."
                  : "Introduction...\n\nBody paragraph 1...\n\nBody paragraph 2...\n\nConclusion..."}
                style={{
                  width: "100%", minHeight: 320,
                  padding: "1rem", resize: "vertical",
                  border: "0.5px solid var(--color-border-secondary)",
                  borderRadius: "var(--border-radius-lg)",
                  background: "var(--color-background-primary)",
                  color: "var(--color-text-primary)",
                  fontSize: 14, lineHeight: 1.8, outline: "none",
                  fontFamily: "var(--font-sans)",
                }}
              />
              {/* Word count badge */}
              <div style={{
                position: "absolute", bottom: 12, right: 12,
                fontSize: 12, padding: "2px 8px", borderRadius: 8,
                background: wordCount >= minWords ? "#E1F5EE" : "#FAEEDA",
                color: wordCount >= minWords ? "#085041" : "#633806",
              }}>
                {wordCount} / {minWords}词
              </div>
            </div>

            {/* Submit row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: wordCount >= minWords ? "#1D9E75" : "var(--color-text-tertiary)" }}>
                {wordCount >= minWords
                  ? <><i className="ti ti-check" style={{ marginRight: 4 }} />字数达标</>
                  : `还需 ${minWords - wordCount} 词`}
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <Btn onClick={() => { setEssay(""); setFeedback(null); }}>
                  <i className="ti ti-trash" /> 清空
                </Btn>
                <Btn primary onClick={handleScore} disabled={!essay.trim() || scoring || wordCount < 50}>
                  {scoring ? <Spinner /> : <><i className="ti ti-robot" /> AI 批改</>}
                </Btn>
              </div>
            </div>
          </div>

          {/* Feedback panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>批改报告</div>

            {!feedback && !scoring && (
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", lineHeight: 1.9 }}>
                完成作文后点击「AI 批改」，系统将从四个维度评分：
                <br /><br />
                <span style={{ color: "#534AB7" }}>● Task Achievement</span><br />任务完成度
                <br /><span style={{ color: "#185FA5" }}>● Coherence & Cohesion</span><br />连贯性与衔接
                <br /><span style={{ color: "#1D9E75" }}>● Lexical Resource</span><br />词汇多样性
                <br /><span style={{ color: "#BA7517" }}>● Grammatical Range</span><br />语法准确度
              </div>
            )}

            {scoring && <Spinner />}

            {feedback && (
              <>
                {/* Overall score */}
                <div style={{ background: "#EEEDFE", borderRadius: "var(--border-radius-md)", padding: "0.75rem", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#534AB7", marginBottom: 2 }}>综合评分</div>
                  <div style={{ fontSize: 40, fontWeight: 500, color: "#3C3489", lineHeight: 1 }}>{feedback.overall}</div>
                  <div style={{ fontSize: 11, color: "#7F77DD", marginTop: 4 }}>
                    字数：{feedback.wordCount} 词
                  </div>
                </div>

                {/* Dimension scores */}
                {Object.entries(DIM_LABELS).filter(([k]) => feedback[k]).map(([key, label]) => (
                  <div key={key}>
                    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "0.75rem" }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6 }}>{label}</div>
                      <div style={{ height: 4, background: "var(--color-background-secondary)", borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
                        <div style={{ height: "100%", width: `${(feedback[key].score / 9) * 100}%`, background: DIM_COLORS[key], borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 3 }}>
                        {feedback[key].score.toFixed(1)} / 9.0
                      </div>
                      {feedback[key].tip && (
                        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>→ {feedback[key].tip}</div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Strong points */}
                {feedback.strongPoints?.length > 0 && (
                  <div style={{ background: "#E1F5EE", borderRadius: "var(--border-radius-md)", padding: "0.75rem", fontSize: 12, color: "#085041", lineHeight: 1.8 }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>✓ 做得好的地方</div>
                    {feedback.strongPoints.map((p, i) => <div key={i}>• {p}</div>)}
                  </div>
                )}

                {/* Improvements */}
                {feedback.improvements?.length > 0 && (
                  <div style={{ background: "#FAEEDA", borderRadius: "var(--border-radius-md)", padding: "0.75rem", fontSize: 12, color: "#633806", lineHeight: 1.8 }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>△ 需要改进</div>
                    {feedback.improvements.map((p, i) => <div key={i}>• {p}</div>)}
                  </div>
                )}

                {/* Rewritten intro */}
                {feedback.rewrittenIntro && (
                  <div style={{ background: "#EEEDFE", borderRadius: "var(--border-radius-md)", padding: "0.75rem", fontSize: 12, color: "#26215C", lineHeight: 1.8 }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>✦ 改写示例（开头段）</div>
                    <div style={{ fontStyle: "italic" }}>{feedback.rewrittenIntro}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricStats({ sessions }) {
  const count = sessions.length;
  const avg = count ? (sessions.reduce((a, b) => a + (b.score || 0), 0) / count).toFixed(1) : "—";
  return (
    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--color-text-secondary)" }}>
      <span>已完成 <strong style={{ color: "var(--color-text-primary)" }}>{count}</strong> 篇</span>
      <span>平均分 <strong style={{ color: "#534AB7" }}>{avg}</strong></span>
    </div>
  );
}
