// Broad JSX fallback to satisfy custom three.js JSX elements during TS compile
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

