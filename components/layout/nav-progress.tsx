"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setActive(false);
    if (timer.current) window.clearTimeout(timer.current);
  }, [pathname, searchParams]);

  useEffect(() => {
    const start = () => {
      setActive(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setActive(false), 8000);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const link = (event.target as HTMLElement | null)?.closest("a");
      if (!link || link.target && link.target !== "_self" || link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
      aria-hidden
    >
      <div className={`h-full bg-ifra-gold ${active ? "nav-progress-bar" : "w-0"}`} />
    </div>
  );
}
