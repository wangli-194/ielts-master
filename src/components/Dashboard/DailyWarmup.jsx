import { useState, useEffect } from "react";
import { getDailyWarmup } from "../../utils/api";
import { useStore } from "../../store";
import { getPhase } from "../../utils/tasks";
import { speak, stopSpeaking, ttsSupported } from "../../utils/tts";

export default function DailyWarmup() {
  const { state } = useStore();
  const phase = getPhase(state.currentDay);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Cache per day in sessionStorage
  const cacheKey = `warmup_day_${state.currentDay}`;

  useEffect(() => {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { setData(JSON.parse(cached)); return; }
    fetchWarmup();
  }, []);

  async function fetchWarmup() {
    setLoading(true);
    try {
      const result = await getDailyWarmup(state.currentDay, phase);
      setData(result);
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (e) {
      setData({
        quote: "Every expert was once a beginner.",
        tip: "今天专注用完整句子回答每一个问题",
        tonguetwister: "Red lorry, yellow lorry, red lorry, yellow lorry.",
        todayFocus: "流利度提升",
      });
    } finally {
      setLoading(false);
    }
  }

  function playTongueTwister() {
    if (!data?.tonguetwister) return;
    if (speaking) { stopSpeaking(); setSpeaking(false); return; }
    setSpeaking(true);
    speak(data.tonguetwister, {
      rate: 0.85,
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  if (dismissed) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, #EEEDFE 0%, #E6F1FB 100%)",
      border: "0.5px solid #AFA9EC",
      borderRadius: "var(--border-radius-lg)",
      padding: "1rem 1.25rem",
      marginBottom: "1rem",
      position: "relative",
    }}>
      <button
        onClick={() => setDismissed(true)}
        style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", cursor: "pointer", color: "#7F77DD", fontSize: 16 }}
        aria-label="关闭"
      >
        <i className="ti ti-x" />
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.6rem" }}>
        <i className="ti ti-sun" style={{ fontSize: 16, color: "#534AB7" }} aria-hidden />
        <span style={{ fontSize: 12, fontWeight: 500, color: "#534AB7" }}>第 {state.currentDay} 天早安 · 今日热身</span>
        <span style={{ marginLeft: "auto", fontSize: 11, background: "#EEEDFE", color: "#3C3489", padding: "1px 8px", borderRadius: 8, border: "0.5px solid #AFA9EC" }}>
          {data?.todayFocus || "今日重点"}
        </span>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "#534AB7" }}>
          <i className="ti ti-loader-2" style={{ marginRight: 6, animation: "spin 1s linear infinite" }} aria-hidden />
          正在生成今日热身...
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : data ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <div style={{ fontSize: 13, fontStyle: "italic", color: "#26215C", lineHeight: 1.6, marginBottom: "0.4rem" }}>
              "{data.quote}"
            </div>
            <div style={{ fontSize: 12, color: "#534AB7" }}>
              <i className="ti ti-bulb" style={{ marginRight: 4 }} aria-hidden />
              {data.tip}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.5)", borderRadius: "var(--border-radius-md)", padding: "0.6rem 0.75rem" }}>
            <div style={{ fontSize: 11, color: "#534AB7", marginBottom: 4 }}>绕口令热身</div>
            <div style={{ fontSize: 12, color: "#26215C", lineHeight: 1.6, marginBottom: 6 }}>{data.tonguetwister}</div>
            {ttsSupported() && (
              <button
                onClick={playTongueTwister}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 11, padding: "3px 10px",
                  background: speaking ? "#534AB7" : "rgba(83,74,183,0.12)",
                  color: speaking ? "#fff" : "#534AB7",
                  border: "0.5px solid #AFA9EC",
                  borderRadius: 8, cursor: "pointer",
                }}
              >
                <i className={`ti ti-${speaking ? "player-pause" : "volume"}`} />
                {speaking ? "停止" : "跟读"}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
