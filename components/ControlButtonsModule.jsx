"use client";

import React from 'react';

export default function ControlButtonsModule({ 
  children,
  className = "",
  style = {}
}) {
  return (
    <div className={`rounded-2xl border border-cyan-400/40 bg-white/5 backdrop-blur-sm px-4 py-2 flex items-center justify-center gap-4 ${className}`} style={style}>
      {children}
    </div>
  );
}