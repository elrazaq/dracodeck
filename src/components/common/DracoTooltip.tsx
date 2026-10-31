import React, { useState, useRef } from "react";

export interface DracoTooltipProps {
  content: React.ReactNode;
  shortcut?: string;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  accent?: "cyan" | "pink" | "green" | "amber";
  children: React.ReactElement;
  className?: string;
}

export const DracoTooltip: React.FC<DracoTooltipProps> = ({
  content,
  shortcut,
  position = "top",
  delay = 100,
  accent = "cyan",
  children,
  className = "",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const showTooltip = () => {
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
  }[position];

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-[#261d38] border-x-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-[#261d38] border-x-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-[#261d38] border-y-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-[#261d38] border-y-transparent border-l-transparent",
  }[position];

  const accentBorder = {
    cyan: "border-[#00e5ff]/40 shadow-[0_4px_16px_rgba(0,229,255,0.15)]",
    pink: "border-[#ff007f]/40 shadow-[0_4px_16px_rgba(255,0,127,0.15)]",
    green: "border-[#00e676]/40 shadow-[0_4px_16px_rgba(0,230,118,0.15)]",
    amber: "border-[#ffea00]/40 shadow-[0_4px_16px_rgba(255,234,0,0.15)]",
  }[accent];

  const accentText = {
    cyan: "text-[#00e5ff]",
    pink: "text-[#ff007f]",
    green: "text-[#00e676]",
    amber: "text-[#ffea00]",
  }[accent];

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}

      {isVisible && (
        <div
          role="tooltip"
          className={`absolute ${positionClasses} z-50 pointer-events-none whitespace-nowrap animate-in fade-in-0 zoom-in-95 duration-100`}
        >
          <div
            className={`bg-[#0e0a19] border ${accentBorder} px-2 py-0.5 rounded-xs flex items-center gap-1.5 text-[10px] font-mono select-none`}
          >
            <span className="text-[#e2e8f0] font-medium tracking-wide">
              {content}
            </span>

            {shortcut && (
              <span
                className={`px-1 py-0.2 bg-[#161026] ${accentText} border border-[#261d38] font-mono text-[9px] font-bold rounded-2xs tracking-tighter`}
              >
                {shortcut}
              </span>
            )}
          </div>

          {/* Micro Arrow */}
          <div
            className={`absolute w-0 h-0 border-4 ${arrowClasses}`}
          />
        </div>
      )}
    </div>
  );
};
