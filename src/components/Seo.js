import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { resolveSeo } from "../utils/seoConfig";

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Applies per-route <title>, meta description, robots, canonical and
 * Open Graph tags on every navigation. Rendered once inside the Router;
 * returns null — it only mutates <head>.
 *
 * Crawlers that execute JS (Googlebot) see the per-route tags; the static
 * tags in public/index.html remain the first-paint/default fallback.
 */
export default function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const { title, description, canonical, robots } = resolveSeo(pathname);

    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", robots);

    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonical);
    upsertLink("canonical", canonical);

    // Keep Twitter in sync so shared links pick up the route title too.
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
  }, [pathname]);

  return null;
}
