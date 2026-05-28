import React from 'react';

const SYMBOL_SRC = "/KEEA CI_1, 심벌마크 기본형-1.png";
const HORIZONTAL_SRC = "/KEEA CI_2. 마크+국문_가로형1.png";

export function KEEASymbol({ className = "" }: { className?: string }) {
  return (
    <img
      src={SYMBOL_SRC}
      alt="KEEA Symbol Logo"
      className={`object-contain ${className}`}
      referrerPolicy="no-referrer"
    />
  );
}

export function KEEAHorizontalLogo({ className = "", textColor = "text-current" }: { className?: string; textColor?: string }) {
  return (
    <img
      src={HORIZONTAL_SRC}
      alt="KEEA Horizontal Logo"
      className={`object-contain h-10 w-auto ${className}`}
      referrerPolicy="no-referrer"
    />
  );
}

