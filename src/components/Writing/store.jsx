import { createContext, useContext, useReducer, useEffect } from "react";

const STORAGE_KEY = "ielts_master_state";

const initialState = {
  // Meta
  startDate: new Date().toISOString().split("T")[0],
  currentDay: 1,
  targetScore: 8.0,
  currentScore: 3.0,
  totalDays: 120,

  // Speaking
  speakingSessions: [],         // { date, part, topic, scores, feedback }
  speakingStreak: 0,

  // Reading
  readingPhase: 1,              // 1=free, 2=countdown, 3=exam
  readingSessions: [],          // { date, passage, timeUsed, phase }

  // Vocab / SRS
  vocabCards: [],               // SM-2 cards: { id, word, def, due, interval, easeFactor, reps }
  vocabStreak: 0,

  // Daily tasks
  todayTasks: [],               // reset each day
  completedTaskIds: [],

  // Writing
  writingSessions: [],          // { date, taskType, title, wordCount, score }
  milestones: [
    { day: 30, targetScore: 5.0, label: "语感启蒙", reached: false },
    { day: 60, targetScore: 6.0, label: "技能夯实", reached: false },
    { day: 90, targetScore: 7.5, label: "专项突破", reached: false },
    { day: 120, targetScore: 8.0, label: "全真冲刺", reached: false },
  ],
};

function reducer(state, action) {
  switch (action.type) {
    case "LOAD_STATE":
      return { ...state, ...action.payload };

    case "COMPLETE_TASK":
      return {
        ...state,
        completedTaskIds: [...state.completedTaskIds, action.id],
      };

    case "UNCOMPLETE_TASK":
      return {
        ...state,
        completedTaskIds: state.completedTaskIds.filter((id) => id !== action.id),
      };

    case "ADD_SPEAKING_SESSION":
      return {
        ...state,
        speakingSessions: [action.session, ...state.speakingSessions].slice(0, 100),
        speakingStreak: state.speakingStreak + 1,
      };

    case "ADD_READING_SESSION":
      return {
        ...state,
        readingSessions: [action.session, ...state.readingSessions].slice(0, 100),
      };

    case "SET_READING_PHASE":
      return { ...state, readingPhase: action.phase };

    case "ADD_VOCAB_CARDS":
      return {
        ...state,
        vocabCards: [...state.vocabCards, ...action.cards],
      };

    case "UPDATE_VOCAB_CARD": {
      const updated = state.vocabCards.map((c) =>
        c.id === action.card.id ? action.card : c
      );
      return { ...state, vocabCards: updated };
    }

    case "ADD_WRITING_SESSION":
      return {
        ...state,
        writingSessions: [action.session, ...(state.writingSessions || [])].slice(0, 100),
      };

    case "UPDATE_CURRENT_SCORE":
      return { ...state, currentScore: action.score };

    case "ADVANCE_DAY":
      return {
        ...state,
        currentDay: state.currentDay + 1,
        completedTaskIds: [],
      };

    default:
      return state;
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) dispatch({ type: "LOAD_STATE", payload: JSON.parse(saved) });
    } catch (e) {
      console.error("Failed to load state:", e);
    }
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save state:", e);
    }
  }, [state]);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
