import { useState, useEffect, useRef } from "react";
import { useStore } from "../../store";
import { lookupWord } from "../../utils/api";
import { createCard } from "../../utils/sm2";
import { Card, CardTitle, Btn, StageBadge, Spinner } from "../ui";

const PHASES = [
  { n: 1, label: "阶段一 · 自由阅读", color: "#085041", bg: "#E1F5EE", seconds: 0, desc: "无计时，专注理解，随时查词" },
  { n: 2, label: "阶段二 · 倒计时提醒", color: "#0C447C", bg: "#E6F1FB", seconds: 60 * 60, desc: "60分钟倒计时，每10分钟提醒一次" },
  { n: 3, label: "阶段三 · 全真模考", color: "#791F1F", bg: "#FCEBEB", seconds: 60 * 60, desc: "严格计时，切标签页立刻提醒" },
];

const SAMPLE_PASSAGE = {
  title: "The Future of Urban Agriculture",
  level: "Academic",
  questions: 13,
  text: [
    { id: "p1", content: "Urban farming has emerged as a ", words: [{ w: "burgeoning", after: " solution to the growing demand for locally sourced food in cities worldwide. As metropolitan populations continue to expand, the " }, { w: "ramifications", after: " of traditional agricultural practices — including transportation emissions and supply chain " }, { w: "vulnerabilities", after: " — have prompted city planners and entrepreneurs to reimagine food production within urban boundaries." }] },
    { id: "p2", content: "Vertical farming, one of the most ", words: [{ w: "salient", after: " innovations in this space, involves cultivating crops in stacked layers under controlled conditions. Proponents argue that such systems can yield up to 350 times more produce per square metre than conventional farming, while using significantly less water due to " }, { w: "recirculation", after: " systems." }] },
    { id: "p3", content: "Despite its promise, urban agriculture faces considerable ", words: [{ w: "impediments", after: ". High initial capital expenditure, complex " }, { w: "regulatory", after: " frameworks, and the challenge of achieving " }, { w: "economies of scale", after: " remain significant barriers to widespread adoption." }] },
  ],
};

export default function Reading() {
  const { state, dispatch } = useStore();
  const [phase, setPhase] = useState(state.readingPhase || 1);
  const [secs, setSecs] = useState(3600);
  const [running, setRunning] = useState(false);
  const [popup, setPopup] = useState(null);   // { word, x, y, data, loading }
  const [addedWords, setAddedWords] = useState(new Set());
  const intervalRef = useRef(null);
  const visRef = useRef(null);

  // Timer
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecs((s) => {
          if (s <= 1) { clearInterval(intervalRef.current); setRunning(false); return 0; }
          // Phase 2: remind every 10 min
          if (phase === 2 && s % 600 === 0 && Notification.permission === "granted") {
            new Notification("IELTS 阅读提醒", { body: `已用时 ${Math.round((3600 - s) / 60)} 分钟` });
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, phase]);

  // Phase 3: page visibility warning
  useEffect(() => {
    if (phase !== 3 || !running) return;
    const handler = () => {
      if (document.hidden) alert("⚠️ 全真模考模式：请勿切换标签页！");
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [phase, running]);

  function switchPhase(n) {
    setPhase(n);
    setRunning(false);
    setSecs(3600);
    clearInterval(intervalRef.current);
    dispatch({ type: "SET_READING_PHASE", phase: n });
  }

  function toggleTimer() {
    if (phase === 1) return;
    if (running) { clearInterval(intervalRef.current); setRunning(false); }
    else {
      if (phase === 3 && Notification.permission === "default") Notification.requestPermission();
      setRunning(true);
    }
  }

  function resetTimer() { clearInterval(intervalRef.current); setRunning(false); setSecs(3600); }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const urgent = secs < 600 && secs > 0 && running;

  async function handleWordClick(word, e) {
    const rect = e.target.getBoundingClientRect();
    setPopup({ word, x: rect.left, y: rect.bottom + 8, loading: true, data: null });
    const data = await lookupWord(word);
    setPopup((p) => p?.word === word ? { ...p, loading: false, data } : p);
  }

  function addToVocab() {
    if (!popup?.data) return;
    const card = createCard(popup.data.word, popup.data.definition, "Reading: " + SAMPLE_PASSAGE.title);
    dispatch({ type: "ADD_VOCAB_CARDS", cards: [card] });
    setAddedWords((s) => new Set([...s, popup.data.word]));
    setPopup(null);
    dispatch({ type: "COMPLETE_TASK", id: "vocab_add" });
  }

  const phaseInfo = PHASES[phase - 1];

  return (
    <div style={{ padding: "1.5rem" }} onClick={() => setPopup(null)}>
      {/* Timer bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1rem 1.25rem", marginBottom: "1rem",
      }}>
        <i className="ti ti-clock" style={{ fontSize: 20, color: "#E24B4A" }} aria-hidden />
        <div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>阅读计时</div>
          <div style={{ fontSize: 32, fontWeight: 500, color: urgent ? "#E24B4A" : "var(--color-text-primary)", fontVariantNumeric: "tabular-nums" }}>
            {phase === 1 ? "自由" : fmt(secs)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>当前阶段</div>
          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 10, background: phaseInfo.bg, color: phaseInfo.color }}>
            {phaseInfo.label}
          </span>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 3 }}>{phaseInfo.desc}</div>
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
          {PHASES.map((p) => (
            <button key={p.n} onClick={() => switchPhase(p.n)}
              style={{
                padding: "5px 12px", borderRadius: "var(--border-radius-md)",
                border: "0.5px solid var(--color-border-secondary)",
                background: phase === p.n ? "#534AB7" : "var(--color-background-secondary)",
                color: phase === p.n ? "#fff" : "var(--color-text-secondary)",
                fontSize: 12, cursor: "pointer",
              }}>
              阶段{p.n}
            </button>
          ))}
          {phase > 1 && (
            <>
              <Btn onClick={toggleTimer} primary>
                <i className={`ti ti-player-${running ? "pause" : "play"}`} /> {running ? "暂停" : "开始"}
              </Btn>
              <Btn onClick={resetTimer}><i className="ti ti-refresh" /></Btn>
            </>
          )}
        </div>
      </div>

      {/* Passage */}
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1.25rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
            {SAMPLE_PASSAGE.title}
          </span>
          <span style={{ fontSize: 11, background: "#E1F5EE", color: "#085041", padding: "2px 8px", borderRadius: 10 }}>
            {SAMPLE_PASSAGE.level}
          </span>
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginLeft: "auto" }}>
            {SAMPLE_PASSAGE.questions} questions
          </span>
        </div>

        {SAMPLE_PASSAGE.text.map((para) => (
          <p key={para.id} style={{ fontSize: 13.5, lineHeight: 1.9, color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
            {para.content}
            {para.words.map(({ w, after }, i) => (
              <span key={i}>
                <span
                  onClick={(e) => { e.stopPropagation(); handleWordClick(w, e); }}
                  style={{ background: addedWords.has(w) ? "#E1F5EE" : "#FAEEDA", borderRadius: 2, cursor: "pointer", padding: "0 1px" }}
                >
                  {w}
                </span>
                {after}
              </span>
            ))}
          </p>
        ))}

        {/* Added words */}
        <div style={{ marginTop: "1rem" }}>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>
            点击高亮词查询 · 已加入词库：
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {[...addedWords].map((w) => (
              <span key={w} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#E1F5EE", color: "#085041", padding: "2px 8px", borderRadius: 10, fontSize: 12 }}>
                <i className="ti ti-check" style={{ fontSize: 11 }} /> {w}
              </span>
            ))}
            {addedWords.size === 0 && <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>暂无</span>}
          </div>
        </div>
      </div>

      {/* Word popup */}
      {popup && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed", top: popup.y, left: Math.min(popup.x, window.innerWidth - 280),
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-secondary)",
            borderRadius: "var(--border-radius-md)",
            padding: "0.75rem", maxWidth: 280, fontSize: 13, zIndex: 100,
          }}
        >
          {popup.loading ? (
            <Spinner />
          ) : popup.data ? (
            <>
              <div style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>
                {popup.data.word}
                {popup.data.phonetic && <span style={{ fontWeight: 400, color: "var(--color-text-secondary)", marginLeft: 6, fontSize: 12 }}>{popup.data.phonetic}</span>}
              </div>
              <div style={{ color: "var(--color-text-secondary)", margin: "4px 0" }}>{popup.data.definition}</div>
              {popup.data.example && <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontStyle: "italic", marginBottom: 8 }}>{popup.data.example}</div>}
              {popup.data.synonyms?.length > 0 && (
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                  近义词：{popup.data.synonyms.join(" · ")}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <Btn small onClick={addToVocab} disabled={addedWords.has(popup.data.word)} primary>
                  <i className="ti ti-plus" /> {addedWords.has(popup.data.word) ? "已加入" : "加入词库"}
                </Btn>
                <Btn small onClick={() => setPopup(null)}>关闭</Btn>
              </div>
            </>
          ) : (
            <div style={{ color: "var(--color-text-tertiary)" }}>查询失败</div>
          )}
        </div>
      )}
    </div>
  );
}
