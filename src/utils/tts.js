/**
 * TTS Engine — wraps Web Speech API SpeechSynthesis
 * Picks the best English voice available (prefers en-GB for examiner feel)
 */

let _voice = null;
let _ready = false;

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Priority: en-GB female > en-GB > en-US female > en-US > any English
  const ranked = [
    voices.find(v => v.lang === "en-GB" && /female|samantha|daniel|kate|serena/i.test(v.name)),
    voices.find(v => v.lang === "en-GB"),
    voices.find(v => v.lang === "en-US" && /female|samantha|zira/i.test(v.name)),
    voices.find(v => v.lang === "en-US"),
    voices.find(v => v.lang.startsWith("en")),
  ];

  return ranked.find(Boolean) || null;
}

export function initTTS() {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve(false);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      _voice = pickVoice();
      _ready = true;
      resolve(true);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        _voice = pickVoice();
        _ready = true;
        resolve(true);
      };
      // Fallback timeout
      setTimeout(() => resolve(false), 2000);
    }
  });
}

export function getAvailableVoices() {
  return window.speechSynthesis?.getVoices().filter(v => v.lang.startsWith("en")) || [];
}

export function setVoice(voiceName) {
  const voices = window.speechSynthesis?.getVoices() || [];
  _voice = voices.find(v => v.name === voiceName) || _voice;
}

let _currentUtterance = null;

export function speak(text, { rate = 0.92, pitch = 1.0, onStart, onEnd, onError } = {}) {
  if (!window.speechSynthesis) { onEnd?.(); return; }

  // Cancel any ongoing speech
  stopSpeaking();

  // Strip markdown-style formatting that sounds bad spoken
  const clean = text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\n+/g, " ")
    .trim();

  const utter = new SpeechSynthesisUtterance(clean);
  utter.rate = rate;
  utter.pitch = pitch;
  utter.volume = 1.0;
  if (_voice) utter.voice = _voice;
  utter.lang = _voice?.lang || "en-GB";

  utter.onstart = () => onStart?.();
  utter.onend = () => { _currentUtterance = null; onEnd?.(); };
  utter.onerror = (e) => { _currentUtterance = null; onError?.(e); onEnd?.(); };

  _currentUtterance = utter;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
  _currentUtterance = null;
}

export function isSpeaking() {
  return window.speechSynthesis?.speaking || false;
}

export const ttsSupported = () =>
  typeof window !== "undefined" && !!window.speechSynthesis;
