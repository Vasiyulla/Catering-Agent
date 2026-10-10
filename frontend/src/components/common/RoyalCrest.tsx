import React from 'react';

interface RoyalCrestProps {
  size?: number;
  className?: string;
}

export const RoyalCrest: React.FC<RoyalCrestProps> = ({ size = 32, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Dil Se Royal Crest"
    >
      {/* Outer Imperial Octagon / Crest Frame */}
      <polygon
        points="24,2 38,8 46,22 40,38 24,46 8,38 2,22 10,8"
        stroke="#C89D42"
        strokeWidth="1.5"
        fill="rgba(12, 43, 34, 0.4)"
      />
      {/* Inner Filigree Ring */}
      <circle
        cx="24"
        cy="24"
        r="15"
        stroke="#C89D42"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
      {/* Royal Crown / Tiara Monogram */}
      <path
        d="M17 28L15 18L21 21L24 14L27 21L33 18L31 28H17Z"
        fill="#C89D42"
        stroke="#C89D42"
        strokeWidth="0.5"
      />
      {/* Intertwined 'D' & 'S' Letterforms in Gold */}
      <path
        d="M20 22C20 20.8954 20.8954 20 22 20H25C26.1046 20 27 20.8954 27 22C27 23.1046 26.1046 24 25 24H23V27H26"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Decorative Star/Diamond at the Apex */}
      <polygon
        points="24,5 25.5,8 24,11 22.5,8"
        fill="#D9531E"
      />
    </svg>
  );
};
