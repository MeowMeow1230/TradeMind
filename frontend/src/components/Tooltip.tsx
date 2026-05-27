"use client";
import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

export default function Tooltip({ text }: { text: string }) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const updatePos = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 4 });
    }
  };

  const handleEnter = () => { updatePos(); setShow(true); };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-terminal-muted text-[8px] text-terminal-muted cursor-help leading-none font-bold select-none ml-0.5 hover:border-amber hover:text-amber transition-colors"
      >
        ?
      </span>
      {mounted && show && createPortal(
        <div
          className="fixed px-3 py-2 bg-[#1a1a1a] border border-amber text-[10px] text-terminal-text leading-relaxed rounded shadow-lg max-w-[260px] z-[9999] pointer-events-none"
          style={{ left: pos.x, top: pos.y, transform: "translateX(-50%)" }}
        >
          {text}
        </div>,
        document.body
      )}
    </>
  );
}
