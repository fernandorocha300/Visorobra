import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const KEY = "tabScroll:";

// Remembers the scroll position of the main scroll container for each route
// (keyed by pathname) in sessionStorage; restores it when returning to the route.
export default function useTabScrollRestoration(scrollRef) {
  const { pathname } = useLocation();
  const latest = useRef(0);

  // Track the current scroll position of the active route
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      latest.current = el.scrollTop;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef]);

  // On route change: restore saved position; on leaving: save it
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const saved = parseInt(sessionStorage.getItem(KEY + pathname) || "0", 10);
    latest.current = saved;
    el.scrollTop = saved;

    // Content (queries) may render after mount; retry briefly until it sticks
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (Math.abs(el.scrollTop - saved) < 2 || tries > 10) {
        clearInterval(timer);
        return;
      }
      el.scrollTop = saved;
    }, 50);

    return () => {
      clearInterval(timer);
      sessionStorage.setItem(KEY + pathname, String(latest.current));
    };
  }, [pathname, scrollRef]);
}