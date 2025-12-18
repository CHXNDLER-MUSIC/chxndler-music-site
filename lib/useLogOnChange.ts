import { useEffect, useRef } from "react";
import { log, debugEnabled } from "./logger";

export function useLogOnChange(label: string, value: any) {
  const last = useRef<string>("");

  useEffect(() => {
    if (!debugEnabled) return;
    const next = JSON.stringify(value);
    if (next !== last.current) {
      last.current = next;
      log(label, value);
    }
  }, [label, value]);
}

