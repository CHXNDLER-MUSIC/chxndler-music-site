import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

export type IdentItem = { id: string };

export function useCycleList<T extends IdentItem>(
  items: T[],
  initialId?: string,
  onChange?: (id: string) => void
) {
  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const [activeId, setActiveId] = useState<string | undefined>(
    initialId && ids.includes(initialId) ? initialId : ids[0]
  );
  
  // Use ref to avoid onChange dependency in useCallback
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep in sync if initialId changes or items change
  // Guard against redundant updates that can cause render loops when parents
  // pass new `items` arrays each render but `initialId` stays the same.
  useEffect(() => {
    if (!ids.length) return;
    if (initialId && ids.includes(initialId)) {
      if (activeId !== initialId) setActiveId(initialId);
    } else if (!activeId || !ids.includes(activeId)) {
      const first = ids[0];
      if (activeId !== first) setActiveId(first);
    }
  }, [initialId, ids, activeId]);

  const index = useMemo(() => Math.max(0, ids.indexOf(activeId || "")), [ids, activeId]);
  const count = ids.length;

  const goToIndex = useCallback(
    (i: number) => {
      if (!count) return;
      const next = (i + count) % count;
      const id = ids[next];
      setActiveId(id);
      onChangeRef.current?.(id);
    },
    [count, ids]
  );

  const next = useCallback(() => goToIndex(index + 1), [goToIndex, index]);
  const prev = useCallback(() => goToIndex(index - 1), [goToIndex, index]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!count) return;
      if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); next(); }
      else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); prev(); }
      else if (e.key === "Home") { e.preventDefault(); goToIndex(0); }
      else if (e.key === "End") { e.preventDefault(); goToIndex(count - 1); }
      else if (e.key === "Enter") { e.preventDefault(); onChangeRef.current?.(activeId || ids[0]); }
    },
    [count, next, prev, goToIndex, activeId, ids]
  );

  return { activeId, setActiveId, index, count, next, prev, goToIndex, handleKeyDown };
}
