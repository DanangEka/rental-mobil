import { useState, useEffect, useCallback, createContext, useContext, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Icon from "./ui/Icon";
import { EDITORIAL_EASE } from "../motion/editorial";

/**
 * Toast surface.
 *
 * The colours are the one place the whole status ramp has to sit on a dark
 * ground: the card is `c57-scrim` (#151515), so the light members of each
 * family carry the signal — `error-container` (#FFDAD6) for error,
 * `on-tertiary-container` (#D2B58C) for warning, `available-bg` (#EDF4EE) for
 * success. The deep members (`error` #BA1A1A, `tertiary` #433011,
 * `available-text` #235C2B) are all too dark to read against #151515 and are
 * deliberately not used here.
 *
 * The signature is `toast[type](message, title)` — body first, label second.
 * It reads backwards from most toast APIs and has bitten callers before (see
 * AdminAddDriver), so it is called out rather than left to be rediscovered.
 *
 * `toast` is memoised. It used to be a fresh object literal on every render of
 * the provider, and the provider re-renders on every add/remove, so any
 * consumer with `toast` in a dependency array tore down and rebuilt its
 * Firestore subscriptions each time a notification fired. `addToast` is
 * already stable, so memoising on it alone makes the whole surface stable for
 * the provider's lifetime.
 *
 * Motion: entering cards pop in, leaving cards slide out through
 * AnimatePresence, and `layout` keeps the rest of the stack from jumping when
 * one card is dismissed mid-stack. Hovering pauses both the auto-dismiss
 * timer and the progress bar, so a toast can be read at leisure.
 */

const VARIANTS = {
  success: { icon: "check_circle", tone: "text-c57-available-bg", bar: "bg-c57-available-bg" },
  error:   { icon: "cancel",       tone: "text-c57-error-container", bar: "bg-c57-error-container" },
  warning: { icon: "warning",      tone: "text-c57-on-tertiary-container", bar: "bg-c57-on-tertiary-container" },
  info:    { icon: "info",         tone: "text-c57-on-scrim", bar: "bg-c57-accent-line" },
};

const AUTO_DISMISS_MS = 3500;

/* ─── Individual Toast ─── */
function ToastItem({ id, type, title, message, onRemove }) {
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(AUTO_DISMISS_MS);
  const startedAtRef = useRef(0);
  const reduceMotion = useReducedMotion();

  const handleRemove = useCallback(() => {
    onRemove(id);
  }, [id, onRemove]);

  // Auto-dismiss, pausable. While paused the remaining time is frozen; the
  // progress bar below pauses with the same state.
  useEffect(() => {
    if (paused) return undefined;
    startedAtRef.current = Date.now();
    const timer = setTimeout(handleRemove, remainingRef.current);
    return () => {
      clearTimeout(timer);
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current));
    };
  }, [paused, handleRemove]);

  const v = VARIANTS[type] || VARIANTS.info;
  // Errors interrupt; everything else waits its turn in the queue.
  const isUrgent = type === "error";

  return (
    <motion.div
      role={isUrgent ? "alert" : "status"}
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0.12 } }
          : { opacity: 0, x: 48, scale: 0.95, transition: { duration: 0.22, ease: EDITORIAL_EASE } }
      }
      transition={{ duration: 0.32, ease: EDITORIAL_EASE }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="relative overflow-hidden rounded-c57-lg border bg-c57-scrim border-white/10 shadow-c57-overlay"
    >
      <div className="flex items-start gap-space-sm p-space-md pr-space-xl">
        <span className={`mt-0.5 shrink-0 ${v.tone}`}>
          <Icon name={v.icon} size="xl" />
        </span>
        <div className="flex-1 min-w-0">
          {title && (
            <p className="font-label-md uppercase tracking-wider text-c57-on-scrim mb-1">
              {title}
            </p>
          )}
          <p className="text-body-sm text-c57-on-scrim/70 leading-snug">{message}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleRemove}
        aria-label="Dismiss notification"
        className="absolute top-3 right-3 p-1 rounded-full text-c57-on-scrim/60 hover:text-c57-on-scrim transition-colors"
      >
        <Icon name="close" size="sm" />
      </button>

      <div
        className={`h-0.5 ${v.bar} absolute bottom-0 left-0 animate-progressBar`}
        style={{ animationPlayState: paused ? "paused" : "running" }}
        aria-hidden="true"
      />
    </motion.div>
  );
}

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const addToast = useCallback((type, message, title) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, type, message, title }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Stable for the provider's lifetime — see the note at the top of the file.
  const toast = useMemo(
    () => ({
      success: (message, title) => addToast("success", message, title),
      error:   (message, title) => addToast("error",   message, title),
      warning: (message, title) => addToast("warning", message, title),
      info:    (message, title) => addToast("info",    message, title),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div id="toast-container" aria-live="polite" aria-atomic="false">
          <AnimatePresence>
            {toasts.map(t => (
              <ToastItem key={t.id} {...t} onRemove={removeToast} />
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
