import { useEffect, useRef, useState } from "react";

/** 한 글자 타이핑·지우기 — 느리고 읽을 수 있는 속도 */
export const INTRO_TYPE_MS = 92;
export const INTRO_ERASE_MS = 48;
export const INTRO_HOLD_MS = 1200;
export const INTRO_BETWEEN_MS = 420;
export const INTRO_START_DELAY_MS = 480;

/**
 * @param {{
 *   enabled: boolean,
 *   lines: string[],
 *   reduceMotion: boolean,
 *   loop?: boolean,
 *   onFinished?: () => void,
 *   onTypeTick?: () => void,
 * }} opts
 */
export function useIntroTypewriter({
  enabled,
  lines,
  reduceMotion,
  loop = false,
  onFinished,
  onTypeTick,
}) {
  const [lineIndex, setLineIndex] = useState(0);
  const [display, setDisplay] = useState("");
  const [active, setActive] = useState(false);
  const runId = useRef(0);

  useEffect(() => {
    if (!enabled) {
      runId.current += 1;
      return undefined;
    }

    const token = ++runId.current;
    const cancelled = () => runId.current !== token;

    setActive(true);
    setLineIndex(0);
    setDisplay("");

    if (reduceMotion) {
      setLineIndex(Math.max(0, lines.length - 1));
      setDisplay(lines[lines.length - 1] ?? "");
      setActive(false);
      onFinished?.();
      return () => {
        runId.current += 1;
      };
    }

    const timers = [];

    const later = (fn, ms) => {
      const id = setTimeout(fn, ms);
      timers.push(id);
    };

    const runLine = (idx) => {
      if (cancelled()) return;
      if (idx >= lines.length) {
        if (loop) {
          later(() => runLine(0), INTRO_BETWEEN_MS * 1.8);
          return;
        }
        setActive(false);
        onFinished?.();
        return;
      }

      const full = lines[idx] ?? "";
      setLineIndex(idx);
      let len = 0;
      setDisplay("");

      const typeStep = () => {
        if (cancelled()) return;
        len += 1;
        setDisplay(full.slice(0, len));
        if (len < full.length) {
          later(typeStep, INTRO_TYPE_MS);
        } else {
          later(eraseStep, INTRO_HOLD_MS);
        }
      };

      const eraseStep = () => {
        if (cancelled()) return;
        len -= 1;
        setDisplay(full.slice(0, Math.max(0, len)));
        if (len > 0) {
          later(eraseStep, INTRO_ERASE_MS);
        } else {
          later(() => runLine(idx + 1), INTRO_BETWEEN_MS);
        }
      };

      typeStep();
    };

    later(() => runLine(0), INTRO_START_DELAY_MS);

    return () => {
      runId.current += 1;
      timers.forEach(clearTimeout);
    };
  }, [enabled, lines, reduceMotion, loop, onFinished, onTypeTick]);

  return { lineIndex, display, active };
}

/**
 * 줄마다 타이핑만 하고 지우지 않음 — 브랜드·CTA 순차 등장용
 * @param {{
 *   enabled: boolean,
 *   lines: string[],
 *   reduceMotion: boolean,
 *   onFinished?: () => void,
 *   typeMs?: number,
 *   betweenMs?: number,
 *   startDelayMs?: number,
 *   onTypeTick?: () => void,
 * }} opts
 */
export function useIntroRevealTypewriter({
  enabled,
  lines,
  reduceMotion,
  onFinished,
  onTypeTick,
  typeMs = INTRO_TYPE_MS,
  betweenMs = INTRO_BETWEEN_MS,
  startDelayMs = INTRO_START_DELAY_MS,
}) {
  const [completedLines, setCompletedLines] = useState([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [display, setDisplay] = useState("");
  const [active, setActive] = useState(false);
  const runId = useRef(0);

  useEffect(() => {
    if (!enabled) {
      runId.current += 1;
      return undefined;
    }

    const token = ++runId.current;
    const cancelled = () => runId.current !== token;
    const timers = [];
    const later = (fn, ms) => {
      timers.push(setTimeout(fn, ms));
    };

    setActive(true);
    setCompletedLines([]);
    setLineIndex(0);
    setDisplay("");

    if (reduceMotion) {
      setCompletedLines(lines);
      setLineIndex(lines.length);
      setDisplay("");
      setActive(false);
      onFinished?.();
      return () => {
        runId.current += 1;
      };
    }

    const runLine = (idx) => {
      if (cancelled()) return;
      if (idx >= lines.length) {
        setActive(false);
        setDisplay("");
        onFinished?.();
        return;
      }

      setActive(true);
      const full = lines[idx] ?? "";
      setLineIndex(idx);
      let len = 0;
      setDisplay("");

      const typeStep = () => {
        if (cancelled()) return;
        len += 1;
        setDisplay(full.slice(0, len));
        onTypeTick?.();
        if (len < full.length) {
          later(typeStep, typeMs);
        } else {
          later(() => {
            if (cancelled()) return;
            setCompletedLines((prev) => [...prev, full]);
            setDisplay("");
            if (idx + 1 >= lines.length) {
              setActive(false);
              setDisplay("");
              onFinished?.();
              return;
            }
            setActive(false);
            setDisplay("");
            later(() => runLine(idx + 1), betweenMs);
          }, betweenMs * 0.6);
        }
      };

      typeStep();
    };

    later(() => runLine(0), startDelayMs);

    return () => {
      runId.current += 1;
      timers.forEach(clearTimeout);
    };
  }, [
    enabled,
    lines,
    reduceMotion,
    onFinished,
    typeMs,
    betweenMs,
    startDelayMs,
    onTypeTick,
  ]);

  return { completedLines, lineIndex, display, active, done: !active && completedLines.length === lines.length };
}
