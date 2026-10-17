"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MicIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

type SpeechAlternative = { transcript?: string };

type SpeechResult = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechAlternative;
};

type SpeechResultList = {
  length: number;
  [index: number]: SpeechResult;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: SpeechResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

function subscribeVoiceSupport() {
  return () => {};
}

function voiceSupportSnapshot() {
  return recognitionCtor() !== null;
}

function voiceSupportServerSnapshot() {
  return true;
}

function spokenText(results: SpeechResultList) {
  let text = "";
  for (let index = 0; index < results.length; index += 1) {
    text += results[index]?.[0]?.transcript ?? "";
  }
  return text.replace(/\s+/g, " ").trim();
}

function permissionMessage(error: string) {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "Microphone access was denied. You can still type to search.";
  }
  if (error === "audio-capture") {
    return "No microphone was found. You can still type to search.";
  }
  if (error === "network") {
    return "Voice search is unavailable right now. You can still type to search.";
  }
  return null;
}

export function useVoiceSearch(query: string, onQueryChange: (value: string) => void) {
  const supported = useSyncExternalStore(subscribeVoiceSupport, voiceSupportSnapshot, voiceSupportServerSnapshot);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = useRef(false);
  const sessionRef = useRef(0);
  const onQueryChangeRef = useRef(onQueryChange);
  useEffect(() => {
    onQueryChangeRef.current = onQueryChange;
  }, [onQueryChange]);

  const stop = useCallback((discard = false) => {
    const recognition = recognitionRef.current;
    if (!listeningRef.current && !recognition) return;
    if (discard) sessionRef.current += 1;
    listeningRef.current = false;
    setListening(false);
    if (!recognition) return;
    if (discard) {
      recognitionRef.current = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // The session already ended.
      }
      return;
    }
    try {
      recognition.stop();
    } catch {
      recognitionRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (query !== "" || !listeningRef.current) return;
    const timer = window.setTimeout(() => stop(true), 0);
    return () => window.clearTimeout(timer);
  }, [query, stop]);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      listeningRef.current = false;
      if (!recognition) return;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // The session already ended.
      }
    };
  }, []);

  function start() {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setMessage("Voice search is not available in this browser.");
      return;
    }
    const previous = recognitionRef.current;
    if (previous) {
      previous.onresult = null;
      previous.onerror = null;
      previous.onend = null;
      try {
        previous.abort();
      } catch {
        // The previous session already ended.
      }
    }
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";
    let ended = false;
    recognition.onresult = (event) => {
      if (session !== sessionRef.current) return;
      const text = spokenText(event.results);
      if (text) onQueryChangeRef.current(text);
    };
    recognition.onerror = (event) => {
      if (session !== sessionRef.current) return;
      const notice = permissionMessage(event.error);
      if (notice) {
        ended = true;
        setMessage(notice);
      }
    };
    recognition.onend = () => {
      ended = true;
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      listeningRef.current = false;
      setListening(false);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setMessage("Voice search couldn't start. You can still type to search.");
      return;
    }
    if (ended || recognitionRef.current !== recognition) return;
    listeningRef.current = true;
    setListening(true);
    setMessage(null);
  }

  function toggle() {
    if (listeningRef.current) stop();
    else start();
  }

  function onUserEdit() {
    if (listeningRef.current) stop(true);
    setMessage(null);
  }

  return { supported, listening, message, toggle, onUserEdit };
}

export function VoiceSearchButton({
  listening,
  supported,
  describedBy,
  onPress,
  appearance,
  className,
}: {
  listening: boolean;
  supported: boolean;
  describedBy?: string;
  onPress: () => void;
  appearance: "circle" | "inset";
  className?: string;
}) {
  const label = listening ? "Stop voice search" : "Start voice search";
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={listening}
      aria-describedby={describedBy}
      disabled={!supported}
      title={supported ? label : "Voice search is not available in this browser"}
      onClick={onPress}
      className={cn(
        "shrink-0 place-items-center rounded-full",
        className,
        listening
          ? "bg-[#ff0000] text-white"
          : appearance === "circle"
            ? "bg-raised hover:bg-raised-hover"
            : "hover-wash",
        !supported && "cursor-not-allowed opacity-40",
      )}
    >
      <MicIcon className="h-5 w-5" />
    </button>
  );
}
