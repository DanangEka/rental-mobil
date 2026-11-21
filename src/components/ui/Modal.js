import { useEffect, useRef, useCallback } from "react";
import Icon from "./Icon";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EDITORIAL_EASE } from "../../motion/editorial";

/**
 * Replaces the eight hand-rolled modal implementations scattered across
 * ListMobil, HistoryPesanan, TripRequestsQueue, AdminDriverProfiles,
 * AdminVehicleVerifications, AdminPaymentVerifications, AdminOpenTrip and
 * TourPackages. Those disagreed on ESC handling, scroll lock and focus, which
 * is why this component's behaviour — not its appearance — is the thing being
 * standardised.
 *
 * Guarantees:
 *   - ESC closes
 *   - backdrop click closes (configurable)
 *   - body scroll is locked while open and restored to its prior value
 *   - focus moves into the dialog on open and returns to the trigger on close
 *   - Tab is trapped within the dialog
 *   - `role="dialog"` + `aria-modal` + labelled by its own heading
 *   - entrance and exit are both animated; exit is faster than entrance
 *
 * The dialog lives in its own component so AnimatePresence can keep it
 * mounted while the exit runs — that way the scroll lock and the focus
 * restore only happen once the panel is actually gone from the screen.
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const SIZES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  full: "max-w-[1360px]",
};

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  closeOnBackdrop = true,
  footer,
  children,
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <ModalDialog
          key="modal"
          onClose={onClose}
          title={title}
          subtitle={subtitle}
          size={size}
          closeOnBackdrop={closeOnBackdrop}
          footer={footer}
        >
          {children}
        </ModalDialog>
      )}
    </AnimatePresence>,
    document.body
  );
}

function ModalDialog({ onClose, title, subtitle, size, closeOnBackdrop, footer, children }) {
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const reduceMotion = useReducedMotion();

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
        return;
      }

      if (e.key !== "Tab" || !panelRef.current) return;

      const items = Array.from(
        panelRef.current.querySelectorAll(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null);

      if (items.length === 0) {
        e.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  // Scroll lock + focus transfer. Runs for the whole mounted life of the
  // dialog — including the exit animation — so the body stays locked and the
  // trigger only regains focus once the panel is off screen. Restores the
  // body's prior overflow rather than assuming it was unset; several pages
  // already set it themselves.
  useEffect(() => {
    triggerRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;

    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target =
        panel.querySelector("[data-autofocus]") || panel.querySelector(FOCUSABLE);
      (target || panel).focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
      if (triggerRef.current && triggerRef.current.focus) {
        triggerRef.current.focus();
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-space-md sm:p-space-lg"
      onKeyDown={handleKeyDown}
    >
      <motion.div
        className="absolute inset-0 bg-c57-scrim/60 backdrop-blur-[12px]"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.18 } }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        initial={reduceMotion ? false : { opacity: 0, y: 26, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.99, transition: { duration: 0.16, ease: "easeIn" } }}
        transition={{ duration: 0.3, ease: EDITORIAL_EASE }}
        className={[
          "relative w-full flex flex-col max-h-[92vh]",
          "bg-c57-surface-container-lowest",
          "rounded-c57-xl shadow-c57-overlay border border-c57-surface-variant",
          SIZES[size],
        ].join(" ")}
      >
        {(title || subtitle) && (
          <header className="flex items-start justify-between gap-space-md px-space-lg py-space-lg border-b border-c57-surface-variant shrink-0">
            <div className="min-w-0">
              {title && (
                <h2 className="font-headline-sm text-headline-sm text-c57-on-surface">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-body-sm text-c57-on-surface-variant mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="shrink-0 -mr-1 -mt-1 p-2 rounded-full text-c57-on-surface-variant hover:text-c57-on-surface hover:bg-c57-surface-container transition-colors"
            >
              <Icon name="close" size="lg" />
            </button>
          </header>
        )}

        <div className="px-space-lg py-space-lg overflow-y-auto grow">{children}</div>

        {footer && (
          <footer className="px-space-lg py-space-md border-t border-c57-surface-variant bg-c57-surface-container-low rounded-b-c57-xl shrink-0">
            {footer}
          </footer>
        )}
      </motion.div>
    </div>
  );
}

export { SIZES as MODAL_SIZES };
