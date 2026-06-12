// Maps day number to phase (1–4) and generates today's task list

export function getPhase(day) {
  if (day <= 30) return 1;
  if (day <= 60) return 2;
  if (day <= 90) return 3;
  return 4;
}

export const PHASE_META = {
  1: { label: "语感启蒙", color: "#1D9E75", bg: "#E1F5EE", targetScore: 5.0, readingMode: "free" },
  2: { label: "技能夯实", color: "#185FA5", bg: "#E6F1FB", targetScore: 6.0, readingMode: "countdown" },
  3: { label: "专项突破", color: "#854F0B", bg: "#FAEEDA", targetScore: 7.5, readingMode: "timed" },
  4: { label: "全真冲刺", color: "#791F1F", bg: "#FCEBEB", targetScore: 8.0, readingMode: "exam" },
};

const SPEAKING_TOPICS = {
  1: ["日常生活与习惯", "家乡与居住环境", "饮食与健康", "学习与工作", "兴趣爱好"],
  2: ["科技对社会的影响", "环境保护", "教育体制", "城市化", "全球化"],
  3: ["经济发展与贫富差距", "人工智能的未来", "文化多样性", "医疗与公共健康", "太空探索"],
  4: ["综合话题演练", "全真模拟考", "弱项专项强化"],
};

export function getTodayTasks(day, dueVocabCount = 0) {
  const phase = getPhase(day);
  const topicPool = SPEAKING_TOPICS[phase];
  const topic = topicPool[day % topicPool.length];
  const part = phase === 1 ? 1 : phase === 2 ? 2 : 3;

  const tasks = [
    {
      id: "vocab_review",
      type: "vocab",
      label: `词汇复习 ${dueVocabCount || 18} 张到期卡片`,
      tag: "词汇",
      tagColor: "#EAF3DE",
      tagText: "#27500A",
      time: "09:00",
    },
    {
      id: "speaking_practice",
      type: "speaking",
      label: `口语 Part ${part} — 话题：${topic}`,
      tag: "口语",
      tagColor: "#EEEDFE",
      tagText: "#3C3489",
      time: "19:30",
      meta: { part, topic },
    },
    {
      id: "reading_practice",
      type: "reading",
      label: `阅读训练 · ${PHASE_META[phase].label}模式`,
      tag: "阅读",
      tagColor: "#E6F1FB",
      tagText: "#0C447C",
      time: "14:00",
    },
    {
      id: "vocab_add",
      type: "vocab",
      label: "生词录入 — 阅读新词加入词汇库",
      tag: "词汇",
      tagColor: "#EAF3DE",
      tagText: "#27500A",
      time: "15:30",
    },
  ];

  if (phase >= 2) {
    tasks.push({
      id: "writing_practice",
      type: "writing",
      label: phase >= 3 ? "写作双题型练习（Task 1 + Task 2）" : "写作任务一 — 图表描述（25分钟）",
      tag: "写作",
      tagColor: "#FAEEDA",
      tagText: "#633806",
      time: "21:00",
    });
  }

  return tasks;
}
