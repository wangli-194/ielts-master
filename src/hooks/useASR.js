import { useState, useRef, useCallback } from "react";

/**
 * useASR — Web Speech API hook
 * Returns { transcript, interimTranscript, listening, supported, start, stop, reset }
 */
export function useASR({ onFinal, lang = "en-US" } = {}) {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const supported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = useCallback(() => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    let finalBuffer = "";

    rec.onstart = () => setListening(true);

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          finalBuffer += r[0].transcript + " ";
        } else {
          interim += r[0].transcript;
        }
      }
      setTranscript(finalBuffer);
      setInterimTranscript(interim);
    };

    rec.onerror = (e) => {
      console.warn("ASR error:", e.error);
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
      setInterimTranscript("");
      const final = finalBuffer.trim();
      if (final) {
        setTranscript(final);
        onFinal?.(final);
      }
    };

    recRef.current = rec;
    rec.start();
  }, [supported, lang, onFinal]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
  }, []);

  const reset = useCallback(() => {
    stop();
    setTranscript("");
    setInterimTranscript("");
  }, [stop]);

  return { transcript, interimTranscript, listening, supported, start, stop, reset };
}
