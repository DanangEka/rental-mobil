import { useReducedMotion } from "framer-motion";

/**
 * Shared editorial motion language — one easing, one reveal variant, one
 * viewport contract. Animated surfaces import from here instead of
 * re-declaring fadeUp locally (it had drifted into identical copies with
 * diverging viewport margins and reduced-motion behaviour).
 *
 * The reveal helper renders the final state directly under
 * prefers-reduced-motion, so content never depends on animation to be
 * visible and spatial movement is dropped rather than state legibility.
 */

export const EDITORIAL_EASE = [0.22, 1, 0.36, 1];

export const EDITORIAL_VIEWPORT = { once: true, margin: "-80px" };

export const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, delay, ease: EDITORIAL_EASE },
  }),
};

/** Props spread onto a motion element for a whileInView reveal. */
export function useEditorialReveal() {
  const reduceMotion = useReducedMotion();
  return (delay = 0) => {
    // Without IntersectionObserver (jsdom, very old browsers) whileInView
    // throws on mount, so degrade to a plain render: content visible, no
    // spatial movement — the same contract as reduced-motion.
    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      return {};
    }
    return {
      initial: "hidden",
      whileInView: "show",
      viewport: EDITORIAL_VIEWPORT,
      variants: fadeUp,
      custom: delay,
    };
  };
}
