'use client';

import React from 'react';

export function Lights() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 15, 10]} intensity={1} />
      <pointLight position={[0, 10, 0]} intensity={0.5} />
    </>
  );
}