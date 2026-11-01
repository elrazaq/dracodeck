import React from "react";

interface DracodeLogoProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

/**
 * Custom Vector SVG Logo for DRACODE (Draco + Code Studio)
 * Combines the angular Kali cyber-dragon crest with sharp code brackets (< / >).
 */
export const DracodeLogo: React.FC<DracodeLogoProps> = ({
  size = 20,
  className = "",
  glow = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${glow ? "drop-shadow-[0_0_10px_rgba(255,0,127,0.65)]" : ""} ${className}`}
    >
      <defs>
        <linearGradient id="dracode_wing_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ff007f" />
          <stop offset="55%" stopColor="#d500f9" />
          <stop offset="100%" stopColor="#00e5ff" />
        </linearGradient>
        <linearGradient id="dracode_blade_grad" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="100%" stopColor="#ff007f" />
        </linearGradient>
      </defs>

      {/* Outer Hexagonal Cyber Shield Frame */}
      <polygon
        points="32,3 58,17 58,47 32,61 6,47 6,17"
        fill="#0d0818"
        stroke="url(#dracode_wing_grad)"
        strokeWidth="2.5"
      />

      {/* Left Code Bracket Wing (<) morphed into Dragon Wing */}
      <path
        d="M23 18L11 32L23 46L26 42L17 32L26 22L23 18Z"
        fill="#00e5ff"
      />

      {/* Right Code Bracket Wing (>) morphed into Dragon Wing */}
      <path
        d="M41 18L53 32L41 46L38 42L47 32L38 22L41 18Z"
        fill="#00e5ff"
      />

      {/* Center Cyber Dragon Crest & Horned Skull */}
      <path
        d="M32 9L24 21L28 24L25 33L32 55L39 33L36 24L40 21L32 9Z"
        fill="url(#dracode_blade_grad)"
      />

      {/* Inner Dragon Core Cutout & Glowing Eyes */}
      <polygon points="32,16 28,25 32,39 36,25" fill="#0b0813" />
      <polygon points="28,24 31,26 29,28" fill="#00e676" />
      <polygon points="36,24 33,26 35,28" fill="#00e676" />
    </svg>
  );
};
