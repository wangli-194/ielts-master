/**
 * TTS Engine
 * 优先使用浏览器原生 Web Speech API
 * 备用：通过 <audio> 播放在线 TTS（有道词典免费接口）
 */

let _voice = null;

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  if (!voices.length) return null;
  const ranked = [
    voices.find(v => v.lang === "en-GB" && /female|kate|serena/i.test(v.name)),
    voices.find(v => v.lang === "en-GB"),
    voices.find(v => v.lang === "en-US" && /female|samantha|zira/i.test(v.name)),
    voices.find(v => v.lang === "en-US"),
    voices.find(v => v.lang.startsWith("en")),
  ];
  return ranked.find(Boolean) || null;
}

// 检测是否有可用的英语语音
function hasEnglishVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  return voices.some(v => v.lang.startsWith("en"));
}

export function initTTS() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(false); return; }
    if (!window.speechSynthesis) { resolve(false); return; }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      _voice = pickVoice();
      resolve(true);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        _voice = pickVoice();
        resolve(true);
      };
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

let _audio = null;

/**
 * 在线 TTS 备用方案 — 有道词典发音接口（免费，无需 key）
 * 仅适合单词发音，不适合长句
 */
function speakOnline(word) {
  return new Promise((resolve) => {
    try {
      if (_audio) { _audio.pause(); _audio = null; }
      // 有道词典英语发音接口
      const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`;
      const audio = new Audio(url);
      audio.onended = () => { _audio = null; resolve(); };
      audio.onerror = () => { _audio = null; resolve(); };
      audio.play().catch(() => resolve());
      _audio = audio;
    } catch (e) {
      resolve();
    }
  });
}

export function speak(text, { rate = 0.88, pitch = 1.0, onStart, onEnd, onError } = {}) {
  const clean = text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/`(.*?)`/g, "$1").replace(/\n+/g, " ").trim();

  // 优先用浏览器原生 TTS（支持长句）
  if (window.speechSynthesis && hasEnglishVoice()) {
    stopSpeaking();
    const utter = new SpeechSynthesisUtterance(clean);
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = 1.0;
    if (_voice) utter.voice = _voice;
    utter.lang = _voice?.lang || "en-US";
    utter.onstart = () => onStart?.();
    utter.onend = () => { onEnd?.(); };
    utter.onerror = () => {
      // 原生 TTS 失败，降级到在线 TTS（仅单词）
      if (clean.split(" ").length <= 3) {
        speakOnline(clean).then(() => onEnd?.());
      } else {
        onEnd?.();
      }
    };
    window.speechSynthesis.speak(utter);
    return;
  }

  // 没有英语语音包，用在线接口（仅支持单词/短语）
  onStart?.();
  const words = clean.split(" ");
  if (words.length <= 5) {
    speakOnline(clean).then(() => onEnd?.());
  } else {
    // 长句无法用在线接口，静默结束
    console.warn("TTS: 无英语语音包，长句无法朗读");
    onEnd?.();
  }
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
  if (_audio) { _audio.pause(); _audio = null; }
}

export function isSpeaking() {
  return window.speechSynthesis?.speaking || !!_audio;
}

export const ttsSupported = () => true; // 始终返回 true，有在线备用方案
