"use client";

import React from "react";
import TwitchEmbed from "@/components/TwitchEmbed";

export default function JoinAliens({ visible = true } = {}) {
  return (
    <div className={`${visible ? 'pointer-events-auto' : 'pointer-events-none'}`} style={{ zIndex: 130, position: 'relative', pointerEvents: visible ? 'auto' : 'none', width: 'fit-content', height: 'fit-content', margin: '0 auto' }}>
      <TwitchEmbed visible={visible} channel="chxndlerthealien" />
    </div>
  );
}
