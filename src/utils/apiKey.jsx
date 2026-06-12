import { createContext, useContext, useState, useEffect } from "react";

const KEY_STORAGE = "ielts_master_apikey";

const ApiKeyContext = createContext(null);

export function ApiKeyProvider({ children }) {
  const [apiKey, setApiKeyState] = useState("");
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY_STORAGE) || "";
    if (saved) { setApiKeyState(saved); setConfigured(true); }
  }, []);

  function saveKey(key) {
    const trimmed = key.trim();
    localStorage.setItem(KEY_STORAGE, trimmed);
    setApiKeyState(trimmed);
    setConfigured(!!trimmed);
  }

  function clearKey() {
    localStorage.removeItem(KEY_STORAGE);
    setApiKeyState("");
    setConfigured(false);
  }

  return (
    <ApiKeyContext.Provider value={{ apiKey, configured, saveKey, clearKey }}>
      {children}
    </ApiKeyContext.Provider>
  );
}

export function useApiKey() {
  return useContext(ApiKeyContext);
}
