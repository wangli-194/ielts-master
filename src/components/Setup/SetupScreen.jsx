import { useState } from "react";
import { useApiKey } from "../../utils/apiKey";

export default function SetupScreen() {
  const { saveKey } = useApiKey();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);

  async function handleSubmit() {
    const key = input.trim();
    if (!key.startsWith("sk-")) {
      setError("API Key 格式不正确，DeepSeek Key 应以 sk- 开头");
      return;
    }
    setTesting(true);
    setError("");
    try {
      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          max_tokens: 5,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      if (res.ok || res.status === 400) {
        saveKey(key);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message || `验证失败 (${res.status})，请检查 Key 是否正确`);
      }
    } catch (e) {
      // CORS on ping is fine — just save the key directly
      saveKey(key);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)", padding: "2rem",
    }}>
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "2.5rem", width: "100%", maxWidth: 480,
      }}>
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6 }}>
            IELTS Master
          </div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            3.0 → 8.0 · 120天四阶段备考系统
          </div>
        </div>

        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "0.5rem" }}>
          配置 DeepSeek API Key
        </div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "1.25rem" }}>
          本应用使用 DeepSeek AI 驱动口语考官、单词查询与评分分析。
          Key 仅存储在浏览器本地，不会上传至任何服务器。
        </div>

        {/* Cost comparison */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: "1.25rem",
        }}>
          {[
            { name: "DeepSeek V3", price: "¥1 / 百万 tokens", highlight: true },
            { name: "GPT-4o", price: "≈ ¥180 / 百万 tokens", highlight: false },
          ].map(({ name, price, highlight }) => (
            <div key={name} style={{
              padding: "0.6rem 0.75rem",
              borderRadius: "var(--border-radius-md)",
              background: highlight ? "#EEEDFE" : "var(--color-background-secondary)",
              border: highlight ? "0.5px solid #AFA9EC" : "0.5px solid var(--color-border-tertiary)",
            }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: highlight ? "#3C3489" : "var(--color-text-primary)" }}>{name}</div>
              <div style={{ fontSize: 11, color: highlight ? "#534AB7" : "var(--color-text-tertiary)", marginTop: 2 }}>{price}</div>
              {highlight && <div style={{ fontSize: 10, color: "#1D9E75", marginTop: 2 }}>推荐使用</div>}
            </div>
          ))}
        </div>

        <input
          type="password"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
          style={{
            width: "100%", padding: "10px 12px", marginBottom: "0.75rem",
            border: `0.5px solid ${error ? "#E24B4A" : "var(--color-border-secondary)"}`,
            borderRadius: "var(--border-radius-md)",
            background: "var(--color-background-primary)",
            color: "var(--color-text-primary)",
            fontSize: 13, outline: "none", fontFamily: "monospace",
          }}
        />

        {error && (
          <div style={{ fontSize: 12, color: "#E24B4A", marginBottom: "0.75rem" }}>
            <i className="ti ti-alert-circle" style={{ marginRight: 4 }} />{error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!input.trim() || testing}
          style={{
            width: "100%", padding: "10px",
            background: !input.trim() || testing ? "var(--color-background-secondary)" : "#534AB7",
            color: !input.trim() || testing ? "var(--color-text-tertiary)" : "#fff",
            border: "none", borderRadius: "var(--border-radius-md)",
            fontSize: 14, cursor: !input.trim() || testing ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {testing
            ? <><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> 验证中...</>
            : <><i className="ti ti-check" /> 开始备考</>}
        </button>

        <div style={{ marginTop: "1.5rem", padding: "0.75rem 1rem", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)" }}>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.8 }}>
            <strong style={{ color: "var(--color-text-primary)" }}>如何获取 DeepSeek API Key？</strong><br />
            1. 访问{" "}
            <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer"
              style={{ color: "#534AB7" }}>platform.deepseek.com</a><br />
            2. 注册账号 → API Keys → 创建新密钥<br />
            3. 充值 ¥10 可用约 3 个月（每次对话约 ¥0.002）
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
