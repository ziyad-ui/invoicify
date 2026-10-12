import { useEffect, useRef, useState } from "react";

/** Tracks an element's rendered width so SVG charts can lay themselves out in real pixels (no stretched text). */
export default function useElementWidth(initial = 640) {
  const ref = useRef(null);
  const [width, setWidth] = useState(initial);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width || initial);
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [initial]);

  return [ref, width];
}
