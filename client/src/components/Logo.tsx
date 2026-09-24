import React from 'react';

export const Logo: React.FC<{ className?: string; size?: number }> = ({ className = 'h-8 w-auto', size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="36" height="36" rx="8" fill="#18181b" />
      <path
        d="M18 9V23M18 9L12 15M18 9L24 15"
        stroke="#f4f4f5"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 21V25C10 26.1046 10.8954 27 12 27H24C25.1046 27 26 26.1046 26 25V21"
        stroke="#a1a1aa"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26" cy="10" r="2.5" fill="#10b981" />
    </svg>
  );
};
