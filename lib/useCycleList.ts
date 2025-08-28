import { useCallback, useEffect, useMemo, useState } from "react";
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

  // Keep in sync if initialId changes or items change
  useEffect(() => {
    if (!ids.length) return;
    if (initialId && ids.includes(initialId)) {
      setActiveId(initialId);
    } else if (!activeId || !ids.includes(activeId)) {
      setActiveId(ids[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId, ids.join("|")]);

  const index = useMemo(() => Math.max(0, ids.indexOf(activeId || "")), [ids, activeId]);
  const count = ids.length;

  const goToIndex = useCallback(
    (i: number) => {
      if (!count) return;
      const next = (i + count) % count;
      const id = ids[next];
      setActiveId(id);
      onChange?.(id);
    },
    [count, ids, onChange]
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
      else if (e.key === "Enter") { e.preventDefault(); onChange?.(activeId || ids[0]); }
    },
    [count, next, prev, goToIndex, onChange, activeId, ids]
  );

  return { activeId, setActiveId, index, count, next, prev, goToIndex, handleKeyDown };
}
