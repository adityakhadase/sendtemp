import React from 'react';

export const Logo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-lg bg-neutral-950 text-white flex items-center justify-center shadow-sm shrink-0 ${className}`}
    >
      <span className="material-symbols-outlined text-[19px] font-semibold">
        north
      </span>
    </div>
  );
};
