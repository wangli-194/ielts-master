import { useStore } from "../../store";
import { getPhase, getTodayTasks, PHASE_META } from "../../utils/tasks";
import { getDueCards } from "../../utils/sm2";
import { Card, CardTitle, MetricCard, Tag, StageBadge, ProgressBar } from "../ui";
import DailyWarmup from "./DailyWarmup";
import { useApiKey } from "../../utils/apiKey";

export default function Dashboard({ onNavigate }) {
  const { state, dispatch } = useStore();
  const phase = getPhase(state.currentDay);
  const meta = PHASE_META[phase];
  const dueCount = getDueCards(state.vocabCards).length;
  const tasks = getTodayTasks(state.currentDay, dueCount);
  const daysPct = Math.round((state.currentDay / state.totalDays) * 100);

  function toggleTask(id) {
    if (state.completedTaskIds.includes(id)) {
      dispatch({ type: "UNCOMPLETE_TASK", id });
    } else {
      dispatch({ type: "COMPLETE_TASK", id });
    }
  }

  const moduleMap = {
    speaking: "speaking",
    reading: "reading",
    vocab: "vocab",
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* Daily warmup */}
      <DailyWarmup />

      {/* Score progress bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "1rem",
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1rem 1.25rem",
        marginBottom: "1rem",
      }}>
        <ScoreCircle score={state.currentScore} label="当前分" bg="#EEEDFE" color="#3C3489" sub="#534AB7" />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>
            <span>第 {state.currentDay} 天 · <StageBadge phase={phase} /></span>
            <span>目标 {state.targetScore} · 剩余 {state.totalDays - state.currentDay} 天</span>
          </div>
          <ProgressBar value={state.currentDay} max={state.totalDays} />
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 5 }}>
            {daysPct}% 完成 · 阶段目标分数 {meta.targetScore}
          </div>
        </div>
        <ScoreCircle score={state.targetScore} label="目标分" bg="#E1F5EE" color="#085041" sub="#1D9E75" />
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: "1rem" }}>
        <MetricCard
          label="本周口语练习"
          value={state.speakingSessions.filter(s => isThisWeek(s.date)).length || 0}
          sub="场 · 建议每天1场"
        />
        <MetricCard
          label="词汇待复习"
          value={dueCount}
          sub={`张 · 词库共 ${state.vocabCards.length} 词`}
        />
        <MetricCard
          label="阅读完成率"
          value={`${calcReadingRate(state.readingSessions)}%`}
          sub="本周阅读任务"
        />
      </div>

      {/* Today's tasks */}
      <Card>
        <CardTitle icon="list-check">今日任务</CardTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tasks.map((task) => {
            const done = state.completedTaskIds.includes(task.id);
            const target = moduleMap[task.type];
            return (
              <div key={task.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: 8, borderRadius: "var(--border-radius-md)",
                background: "var(--color-background-secondary)",
              }}>
                <button
                  onClick={() => toggleTask(task.id)}
                  style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    border: done ? "none" : "0.5px solid var(--color-border-secondary)",
                    background: done ? "#1D9E75" : "var(--color-background-primary)",
                    color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                  aria-label={done ? "标为未完成" : "标为完成"}
                >
                  {done && <i className="ti ti-check" style={{ fontSize: 11 }} />}
                </button>
                <span style={{
                  flex: 1, fontSize: 13,
                  color: done ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
                  textDecoration: done ? "line-through" : "none",
                }}>
                  {task.label}
                </span>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginRight: 4 }}>{task.time}</span>
                <Tag bg={task.tagColor} color={task.tagText}>{task.tag}</Tag>
                {target && !done && (
                  <button
                    onClick={() => onNavigate(target)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#534AB7", fontSize: 12, padding: "0 4px" }}
                    aria-label={`前往${task.tag}模块`}
                  >
                    <i className="ti ti-arrow-right" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Daily reminders */}
      <Card>
        <CardTitle icon="bell">今日提醒安排</CardTitle>
        {tasks.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: "var(--color-text-tertiary)", minWidth: 48 }}>{t.time}</span>
            <span style={{ color: t.tagText }}>● {t.label}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ScoreCircle({ score, label, bg, color, sub }) {
  return (
    <div style={{
      width: 56, height: 56, borderRadius: "50%", background: bg,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", flexShrink: 0,
    }}>
      <span style={{ fontSize: 20, fontWeight: 500, color, lineHeight: 1 }}>{score}</span>
      <span style={{ fontSize: 9, color: sub, marginTop: 1 }}>{label}</span>
    </div>
  );
}

function isThisWeek(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff < 7;
}

function calcReadingRate(sessions) {
  const thisWeek = sessions.filter(s => isThisWeek(s.date));
  if (!thisWeek.length) return 0;
  // Target: 5 sessions/week
  return Math.min(100, Math.round((thisWeek.length / 5) * 100));
}
