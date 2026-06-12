import { useStore } from "../../store";
import { getPhase, PHASE_META } from "../../utils/tasks";
import { Card, CardTitle, MetricCard } from "../ui";

export default function Progress() {
  const { state } = useStore();
  const phase = getPhase(state.currentDay);

  const speakingAvg = avg(state.speakingSessions.map((s) => s.scores?.overall).filter(Boolean));
  const readingAvg = avgTime(state.readingSessions.map((s) => s.timeUsed).filter(Boolean));
  const mastered = state.vocabCards.filter((c) => c.reps >= 3).length;

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "1rem" }}>
        备考进度 — 120天全局视图
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: "1rem" }}>
        <MetricCard
          label="口语模拟场次"
          value={state.speakingSessions.length}
          sub={speakingAvg ? `平均评分 ${speakingAvg.toFixed(1)}` : "暂无数据"}
        />
        <MetricCard
          label="阅读平均用时"
          value={readingAvg ? `${readingAvg}分` : "—"}
          sub="目标 60分钟"
        />
        <MetricCard
          label="词汇掌握量"
          value={mastered}
          sub={`目标 3500词 · ${Math.round((mastered / 3500) * 100)}%`}
        />
      </div>

      {/* Score curve */}
      <Card>
        <CardTitle icon="chart-line">分数预测曲线（120天）</CardTitle>
        <ScoreCurve currentDay={state.currentDay} currentScore={state.currentScore} sessions={state.speakingSessions} />
      </Card>

      {/* 4-phase plan */}
      <Card>
        <CardTitle icon="target">四阶段计划</CardTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3, 4].map((p) => {
            const m = PHASE_META[p];
            const active = phase === p;
            const done = phase > p;
            return (
              <div key={p} style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: 10,
                background: active ? "#EEEDFE" : "var(--color-background-secondary)",
                borderRadius: "var(--border-radius-md)",
                border: active ? "0.5px solid #AFA9EC" : "0.5px solid transparent",
              }}>
                <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 10, fontWeight: 500, background: m.bg, color: m.color, whiteSpace: "nowrap", marginTop: 2 }}>
                  第{p}月
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{m.label}</span>
                    {done && <span style={{ fontSize: 11, background: "#E1F5EE", color: "#085041", padding: "1px 6px", borderRadius: 8 }}>已完成</span>}
                    {active && <span style={{ fontSize: 11, background: "#EEEDFE", color: "#534AB7", padding: "1px 6px", borderRadius: 8 }}>进行中</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {PHASE_DESC[p]}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: m.color, whiteSpace: "nowrap" }}>→ {m.targetScore}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent sessions */}
      {state.speakingSessions.length > 0 && (
        <Card>
          <CardTitle icon="history">最近口语记录</CardTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {state.speakingSessions.slice(0, 5).map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, padding: "6px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <span style={{ color: "var(--color-text-tertiary)", minWidth: 80 }}>{s.date}</span>
                <span style={{ color: "var(--color-text-secondary)" }}>Part {s.part} · {s.topic}</span>
                {s.scores?.overall && (
                  <span style={{ marginLeft: "auto", fontWeight: 500, color: "#534AB7" }}>{s.scores.overall}</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

const PHASE_DESC = {
  1: "词汇积累 800词 · 口语日常话题流利度 · 阅读自由模式生词收集",
  2: "词汇 1800词 · 口语 Part 2 长段独白训练 · 阅读倒计时强化",
  3: "词汇 2800词 · 口语 Part 3 抽象话题 · 阅读限时精练 · 写作双题型强化",
  4: "全套真题模考 · 限时锁定阅读 · 口语考场还原录音自评 · 弱项精准补强",
};

function avg(arr) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function avgTime(arr) {
  if (!arr.length) return null;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length / 60);
}

function ScoreCurve({ currentDay, currentScore, sessions }) {
  const W = 540, H = 170, PL = 50, PR = 10, PT = 20, PB = 25;
  const plotW = W - PL - PR, plotH = H - PT - PB;

  const scoreToY = (s) => PT + plotH - ((s - 2) / 7) * plotH;
  const dayToX = (d) => PL + (d / 120) * plotW;

  const milestones = [
    { day: 0, score: 3.0 },
    { day: 30, score: 5.0 },
    { day: 60, score: 6.0 },
    { day: 90, score: 7.5 },
    { day: 120, score: 8.0 },
  ];

  const actual = [{ day: 0, score: 3.0 }, ...sessions.slice(0, 20).reverse().map((s, i) => ({
    day: Math.min(currentDay, i + 1),
    score: s.scores?.overall || 3.0,
  }))];
  if (actual[actual.length - 1].day !== currentDay) {
    actual.push({ day: currentDay, score: currentScore });
  }

  const toPoint = (arr) => arr.map((p) => `${dayToX(p.day)},${scoreToY(p.score)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={{ width: "100%" }}>
      {/* Grid */}
      {[2, 4, 5, 6, 7, 8].map((s) => (
        <g key={s}>
          <line x1={PL} y1={scoreToY(s)} x2={W - PR} y2={scoreToY(s)} stroke="#D3D1C7" strokeWidth="0.5" strokeDasharray="3,4" />
          <text x={PL - 6} y={scoreToY(s) + 4} fontSize="10" textAnchor="end" fill="#888780">{s}.0</text>
        </g>
      ))}
      {[0, 30, 60, 90, 120].map((d) => (
        <g key={d}>
          <line x1={dayToX(d)} y1={PT} x2={dayToX(d)} y2={H - PB} stroke="#D3D1C7" strokeWidth="0.5" strokeDasharray="2,4" />
          <text x={dayToX(d)} y={H - 5} fontSize="10" textAnchor="middle" fill="#888780">第{d}天</text>
        </g>
      ))}
      {/* Planned curve */}
      <polyline points={toPoint(milestones)} fill="none" stroke="#AFA9EC" strokeWidth="1.5" strokeDasharray="5,3" />
      {/* Actual */}
      {actual.length > 1 && (
        <polyline points={toPoint(actual)} fill="none" stroke="#534AB7" strokeWidth="2" />
      )}
      {/* Milestone dots */}
      {milestones.map(({ day, score }) => (
        <g key={day}>
          <circle cx={dayToX(day)} cy={scoreToY(score)} r={day === 120 ? 5 : 3} fill={day === 120 ? "#1D9E75" : "#AFA9EC"} />
          {day === 120 && <text x={dayToX(day) - 2} y={scoreToY(score) - 8} fontSize="10" fill="#1D9E75" textAnchor="end">目标 8.0</text>}
        </g>
      ))}
      {/* Current position */}
      <circle cx={dayToX(currentDay)} cy={scoreToY(currentScore)} r={5} fill="#534AB7" stroke="#fff" strokeWidth="2" />
      <text x={dayToX(currentDay) + 8} y={scoreToY(currentScore) + 4} fontSize="10" fill="#534AB7">今天</text>
    </svg>
  );
}
