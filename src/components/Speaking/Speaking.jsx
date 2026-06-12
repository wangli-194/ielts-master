import { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "../../store";
import { callClaudeStream, scoreSpeaking, EXAMINER_SYSTEM } from "../../utils/api";
import { speak, stopSpeaking, initTTS, ttsSupported, getAvailableVoices, setVoice } from "../../utils/tts";
import { useASR } from "../../hooks/useASR";
import { getPhase } from "../../utils/tasks";
import { SPEAKING_PART1, SPEAKING_PART2 } from "../../data/questionBank";
import { Card, Btn, ScoreDimBar, Spinner } from "../ui";

const DIM_COLORS = {
  fluency: "#534AB7", lexical: "#185FA5", grammar: "#1D9E75", pronunciation: "#BA7517",
};

export default function Speaking() {
  const { state, dispatch } = useStore();
  const phase = getPhase(state.currentDay);

  const [part, setPart]           = useState(1);
  const [topicId, setTopicId]     = useState(SPEAKING_PART1[0].id);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [streaming, setStreaming] = useState(false);
  const [examinerSpeaking, setExaminerSpeaking] = useState(false);
  const [scoring, setScoring]     = useState(false);
  const [scoreResult, setScoreResult] = useState(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionEnded, setSessionEnded]     = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [voices, setVoices]       = useState([]);
  const [activeTab, setActiveTab] = useState("chat"); // chat | score | bank

  const chatRef = useRef(null);

  useEffect(() => {
    initTTS().then(() => {
      const v = getAvailableVoices();
      setVoices(v);
    });
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const { transcript, interimTranscript, listening, supported: asrSupported, start: startASR, stop: stopASR, reset: resetASR } = useASR({
    onFinal: (text) => setInput(text),
  });

  const currentTopic = part === 1
    ? SPEAKING_PART1.find(t => t.id === topicId) || SPEAKING_PART1[0]
    : SPEAKING_PART2.find(t => t.id === topicId) || SPEAKING_PART2[0];

  const topicLabel = part === 1
    ? currentTopic.topic
    : currentTopic.topic;

  async function startSession() {
    stopSpeaking();
    setMessages([]);
    setScoreResult(null);
    setSessionEnded(false);
    setSessionStarted(true);
    setInput("");
    resetASR();
    setActiveTab("chat");

    const startMsg = part === 1
      ? `Start the Part 1 IELTS interview on the topic: "${topicLabel}". Ask your first question.`
      : `Start the Part 2 IELTS interview. Present this cue card to the candidate:\n\n${currentTopic.cueCard}\n\nSay "You have one minute to prepare."`;

    await examinerTurn([], startMsg);
  }

  async function examinerTurn(history, userMsg) {
    const updated = userMsg ? [...history, { role: "user", content: userMsg }] : history;
    setStreaming(true);
    let reply = "";

    try {
      await callClaudeStream(
        updated,
        EXAMINER_SYSTEM(part, topicLabel),
        (chunk) => {
          reply += chunk;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last.streaming) {
              return [...prev.slice(0, -1), { role: "assistant", content: reply, streaming: true }];
            }
            return [...prev, { role: "assistant", content: reply, streaming: true }];
          });
        },
        350
      );

      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, streaming: false } : m));

      if (reply.toLowerCase().includes("end of part")) setSessionEnded(true);

      if (ttsEnabled && ttsSupported() && reply) {
        setExaminerSpeaking(true);
        speak(reply, {
          rate: 0.90, pitch: 0.95,
          onEnd: () => setExaminerSpeaking(false),
          onError: () => setExaminerSpeaking(false),
        });
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ Error: ${e.message}` }]);
    } finally {
      setStreaming(false);
    }
  }

  async function handleSend() {
    const content = input.trim();
    if (!content || streaming || examinerSpeaking) return;
    stopSpeaking();
    setExaminerSpeaking(false);
    setInput("");
    resetASR();
    const updated = [...messages, { role: "user", content }];
    setMessages(updated);
    await examinerTurn(updated, null);
  }

  function toggleMic() {
    if (listening) { stopASR(); }
    else { stopSpeaking(); setExaminerSpeaking(false); resetASR(); startASR(); }
  }

  async function handleScore() {
    setScoring(true);
    stopSpeaking();
    setActiveTab("score");
    const tx = messages.map(m => `${m.role === "user" ? "Candidate" : "Examiner"}: ${m.content}`).join("\n");
    const result = await scoreSpeaking(tx);
    setScoreResult(result);
    setScoring(false);
    if (result) {
      dispatch({ type: "ADD_SPEAKING_SESSION", session: { date: new Date().toISOString().split("T")[0], part, topic: topicLabel, scores: result } });
      dispatch({ type: "COMPLETE_TASK", id: "speaking_practice" });
    }
  }

  const canScore = messages.filter(m => m.role === "user").length >= 3;
  const TABS = [
    { id: "chat",  label: "对话", icon: "message" },
    { id: "score", label: "评分报告", icon: "chart-bar" },
    { id: "bank",  label: "题库", icon: "book" },
  ];

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Top controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>口语对话</span>
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3].map(p => (
            <button key={p} onClick={() => {
              setPart(p);
              setTopicId(p === 1 ? SPEAKING_PART1[0].id : SPEAKING_PART2[0].id);
            }}
              style={{ padding: "4px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: part === p ? "#534AB7" : "var(--color-background-secondary)", color: part === p ? "#fff" : "var(--color-text-secondary)", fontSize: 12, cursor: "pointer" }}>
              Part {p}
            </button>
          ))}
        </div>

        <select value={topicId} onChange={e => setTopicId(e.target.value)}
          style={{ fontSize: 12, padding: "4px 8px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", maxWidth: 200 }}>
          {(part === 1 ? SPEAKING_PART1 : SPEAKING_PART2).map(t => (
            <option key={t.id} value={t.id}>{t.topicZh}</option>
          ))}
        </select>

        {ttsSupported() && (
          <button onClick={() => { setTtsEnabled(v => !v); if (ttsEnabled) stopSpeaking(); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: ttsEnabled ? "#534AB7" : "var(--color-text-tertiary)" }}
            title={ttsEnabled ? "关闭朗读" : "开启朗读"}>
            <i className={`ti ti-volume${ttsEnabled ? "" : "-off"}`} />
          </button>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {canScore && (
            <Btn onClick={handleScore} disabled={scoring}>
              {scoring ? <Spinner /> : <><i className="ti ti-chart-bar" /> 获取评分</>}
            </Btn>
          )}
          <Btn primary onClick={startSession} disabled={streaming}>
            <i className={`ti ti-${sessionStarted ? "refresh" : "player-play"}`} />
            {sessionStarted ? "重新开始" : "开始对话"}
          </Btn>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 16px", border: "none", borderBottom: activeTab === t.id ? "2px solid #534AB7" : "2px solid transparent", background: "none", color: activeTab === t.id ? "#534AB7" : "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>
            <i className={`ti ti-${t.icon}`} style={{ fontSize: 14 }} />
            {t.label}
          </button>
        ))}
        {sessionStarted && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            {examinerSpeaking && <span style={{ color: "#534AB7", display: "flex", alignItems: "center", gap: 5 }}><SoundWave />考官朗读中 <button onClick={() => { stopSpeaking(); setExaminerSpeaking(false); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#534AB7" }}>停止</button></span>}
            {listening && <span style={{ color: "#E24B4A" }}><i className="ti ti-microphone" style={{ marginRight: 3 }} />聆听中...</span>}
            {sessionEnded && !scoreResult && <span style={{ color: "#1D9E75" }}><i className="ti ti-check" style={{ marginRight: 3 }} />本轮结束</span>}
          </div>
        )}
      </div>

      {/* Chat tab */}
      {activeTab === "chat" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div ref={chatRef} style={{ minHeight: 320, maxHeight: 420, overflowY: "auto", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem", display: "flex", flexDirection: "column", gap: 12 }}>
            {!sessionStarted ? (
              <div style={{ color: "var(--color-text-tertiary)", fontSize: 13, textAlign: "center", margin: "auto", lineHeight: 2 }}>
                选择话题，点击「开始对话」<br />
                {part === 2 && <span style={{ fontSize: 12 }}>Part 2 将呈现 Cue Card，1分钟准备后作答</span>}
              </div>
            ) : messages.map((m, i) => <ChatBubble key={i} m={m} />)}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {asrSupported && (
              <button onClick={toggleMic}
                style={{ width: 44, height: 44, borderRadius: "50%", background: listening ? "#E24B4A" : "#534AB7", border: "none", cursor: "pointer", color: "#fff", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", animation: listening ? "pulse 1s infinite" : "none", flexShrink: 0 }}
                aria-label={listening ? "停止录音" : "开始录音"}>
                <i className={`ti ti-microphone${listening ? "-off" : ""}`} />
              </button>
            )}
            <input
              value={listening && interimTranscript ? interimTranscript : input}
              onChange={e => !listening && setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={listening ? "聆听中..." : "输入或语音作答 (Enter 发送)"}
              readOnly={listening}
              style={{ flex: 1, padding: "9px 12px", border: `0.5px solid ${listening ? "#E24B4A" : "var(--color-border-secondary)"}`, borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, outline: "none" }}
            />
            <Btn primary onClick={handleSend} disabled={!input.trim() || streaming || examinerSpeaking}>
              发送 <i className="ti ti-arrow-right" />
            </Btn>
          </div>
          <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(226,75,74,.35)}50%{box-shadow:0 0 0 9px rgba(226,75,74,0)}}`}</style>
        </div>
      )}

      {/* Score tab */}
      {activeTab === "score" && (
        <div>
          {scoring && <div style={{ padding: "2rem", textAlign: "center" }}><Spinner /></div>}
          {!scoring && !scoreResult && (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-tertiary)", fontSize: 13 }}>
              完成至少 3 轮对话后点击「获取评分」
            </div>
          )}
          {scoreResult && <ScoreReport result={scoreResult} />}
        </div>
      )}

      {/* Question bank tab */}
      {activeTab === "bank" && (
        <QuestionBank part={part} currentTopicId={topicId} onSelect={(id) => { setTopicId(id); setActiveTab("chat"); }} />
      )}
    </div>
  );
}

function ChatBubble({ m }) {
  const isUser = m.role === "user";
  return (
    <div style={{ maxWidth: "88%", alignSelf: isUser ? "flex-end" : "flex-start", background: isUser ? "#534AB7" : "#EEEDFE", color: isUser ? "#fff" : "#26215C", padding: "10px 14px", borderRadius: 12, borderBottomRightRadius: isUser ? 4 : 12, borderBottomLeftRadius: isUser ? 12 : 4, fontSize: 13.5, lineHeight: 1.65 }}>
      {m.content}{m.streaming && <span style={{ opacity: 0.5 }}>▋</span>}
    </div>
  );
}

function ScoreReport({ result }) {
  const dims = [
    { key: "fluency",       label: "流利度 Fluency",          color: "#534AB7" },
    { key: "lexical",       label: "词汇多样性 Lexical",       color: "#185FA5" },
    { key: "grammar",       label: "语法准确度 Grammar",       color: "#1D9E75" },
    { key: "pronunciation", label: "发音 Pronunciation",       color: "#BA7517" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "1rem" }}>
      {/* Left: overall + bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ background: "#EEEDFE", borderRadius: "var(--border-radius-lg)", padding: "1.25rem", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#534AB7", marginBottom: 4 }}>综合评分</div>
          <div style={{ fontSize: 52, fontWeight: 500, color: "#3C3489", lineHeight: 1 }}>{result.overall}</div>
          <div style={{ fontSize: 11, color: "#7F77DD", marginTop: 6 }}>Band Score</div>
          <div style={{ marginTop: 12 }}>
            <div style={{ height: 4, background: "#fff", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(result.overall / 9) * 100}%`, background: "#534AB7", borderRadius: 2 }} />
            </div>
          </div>
        </div>
        {dims.map(({ key, label, color }) => result[key] && (
          <ScoreDimBar key={key} name={label} score={result[key].score || 0} color={color} />
        ))}
      </div>

      {/* Right: comments + tips */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {dims.map(({ key, label, color }) => result[key] && (
          <div key={key} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{label}</span>
              <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 500, color }}>{result[key].score?.toFixed(1)}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>{result[key].comment}</div>
            <div style={{ fontSize: 12, color, background: `${color}18`, padding: "4px 8px", borderRadius: 6 }}>
              → {result[key].tip}
            </div>
          </div>
        ))}

        {result.lexical?.suggestions?.length > 0 && (
          <div style={{ background: "#EEEDFE", borderRadius: "var(--border-radius-md)", padding: "0.75rem", fontSize: 12, color: "#26215C", lineHeight: 1.8 }}>
            <div style={{ fontWeight: 500, marginBottom: 6 }}>✦ 表达升级建议</div>
            {result.lexical.suggestions.map((s, i) => <div key={i}>• {s}</div>)}
          </div>
        )}

        {result.grammar?.errors?.length > 0 && (
          <div style={{ background: "#FCEBEB", borderRadius: "var(--border-radius-md)", padding: "0.75rem", fontSize: 12, color: "#4A1B0C", lineHeight: 1.8 }}>
            <div style={{ fontWeight: 500, marginBottom: 6 }}>✗ 语法纠错</div>
            {result.grammar.errors.map((e, i) => <div key={i}>• {e}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionBank({ part, currentTopicId, onSelect }) {
  const topics = part === 1 ? SPEAKING_PART1 : SPEAKING_PART2;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>
        2025–2026 最新题库 · 点击话题直接开始练习
      </div>
      {topics.map(t => (
        <div key={t.id} onClick={() => onSelect(t.id)}
          style={{ background: t.id === currentTopicId ? "#EEEDFE" : "var(--color-background-primary)", border: `0.5px solid ${t.id === currentTopicId ? "#AFA9EC" : "var(--color-border-tertiary)"}`, borderRadius: "var(--border-radius-md)", padding: "0.75rem 1rem", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: part === 1 ? 6 : 4 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: t.id === currentTopicId ? "#3C3489" : "var(--color-text-primary)" }}>{t.topicZh}</span>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{t.topic}</span>
            {t.id === currentTopicId && <span style={{ marginLeft: "auto", fontSize: 11, background: "#534AB7", color: "#fff", padding: "1px 8px", borderRadius: 8 }}>当前</span>}
          </div>
          {part === 1 && t.questions && (
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
              {t.questions.slice(0, 2).map((q, i) => <div key={i}>· {q}</div>)}
              {t.questions.length > 2 && <div style={{ color: "var(--color-text-tertiary)" }}>+ {t.questions.length - 2} more questions...</div>}
            </div>
          )}
          {part === 2 && t.cueCard && (
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "pre-line", lineHeight: 1.7 }}>
              {t.cueCard.split("\n").slice(0, 3).join("\n")}...
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SoundWave() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
      {[1,2,3,4].map(i => (
        <span key={i} style={{ display: "inline-block", width: 2, height: 8, background: "#534AB7", borderRadius: 1, animation: `wave 0.8s ease-in-out ${i*0.1}s infinite alternate` }} />
      ))}
      <style>{`@keyframes wave{0%{height:3px}100%{height:12px}}`}</style>
    </span>
  );
}
