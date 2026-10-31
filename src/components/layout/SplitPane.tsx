import React, { useState, useRef, useCallback } from "react";

interface SplitPaneProps {
  direction?: "horizontal" | "vertical";
  initialSplit?: number; // percentage (e.g. 50)
  minSize?: number; // min percentage (e.g. 20)
  maxSize?: number; // max percentage (e.g. 80)
  left: React.ReactNode;
  right: React.ReactNode;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  direction = "horizontal",
  initialSplit = 50,
  minSize = 20,
  maxSize = 80,
  left,
  right,
}) => {
  const [split, setSplit] = useState(initialSplit);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let percent: number;

      if (direction === "horizontal") {
        const offset = moveEvent.clientX - rect.left;
        percent = (offset / rect.width) * 100;
      } else {
        const offset = moveEvent.clientY - rect.top;
        percent = (offset / rect.height) * 100;
      }

      const clamped = Math.min(Math.max(percent, minSize), maxSize);
      setSplit(clamped);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [direction, minSize, maxSize]);

  const isHoriz = direction === "horizontal";

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex ${
        isHoriz ? "flex-row" : "flex-col"
      } overflow-hidden`}
    >
      {/* Pane 1 */}
      <div
        style={{ [isHoriz ? "width" : "height"]: `${split}%` }}
        className="h-full overflow-hidden flex flex-col"
      >
        {left}
      </div>

      {/* Resizer Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`${
          isHoriz
            ? "w-1 cursor-col-resize hover:bg-[#00e5ff] active:bg-[#00e5ff]"
            : "h-1 cursor-row-resize hover:bg-[#00e5ff] active:bg-[#00e5ff]"
        } bg-[#1b253b] transition-colors z-20 flex-shrink-0 select-none`}
      />

      {/* Pane 2 */}
      <div
        style={{ [isHoriz ? "width" : "height"]: `${100 - split}%` }}
        className="h-full overflow-hidden flex flex-col"
      >
        {right}
      </div>
    </div>
  );
};

