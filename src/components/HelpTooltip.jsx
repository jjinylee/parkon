import { useState } from 'react';

export default function HelpTooltip({ text, className = '' }) {
  const [show, setShow] = useState(false);

  return (
    <span
      className={`relative inline-flex items-center cursor-pointer ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
    >
      <span className="material-symbols-outlined text-text-sub text-base select-none">help_outline</span>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
          <div className="bg-[#171C1F] text-[#EDF1F5] text-xs rounded px-3 py-2 whitespace-nowrap shadow-lg">
            {text}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#171C1F] rotate-45 -mt-1"></div>
        </div>
      )}
    </span>
  );
}
