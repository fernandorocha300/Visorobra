import React, { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowDown } from "lucide-react";

const THRESHOLD = 70;
const MAX_PULL = 110;

// Wraps scrollable content. Pull down from the top to refresh the given query keys.
export default function PullToRefresh({ children, queryKeys = [], scrollRef }) {
  const qc = useQueryClient();
  const startY = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const atTop = () => {
    const el = scrollRef?.current;
    return !el || el.scrollTop <= 0;
  };

  const onTouchStart = (e) => {
    if (refreshing || !atTop()) return;
    startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e) => {
    if (startY.current == null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && atTop()) {
      setPull(Math.min(dy * 0.5, MAX_PULL));
    } else {
      setPull(0);
    }
  };

  const onTouchEnd = async () => {
    if (startY.current == null) return;
    startY.current = null;
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(THRESHOLD);
      await Promise.all(
        queryKeys.map((queryKey) => qc.invalidateQueries({ queryKey }))
      );
      setRefreshing(false);
    }
    setPull(0);
  };

  const ready = pull >= THRESHOLD;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      className="min-h-full"
    >
      <div
        className="flex items-center justify-center overflow-hidden text-primary transition-[height] duration-150"
        style={{ height: refreshing ? THRESHOLD * 0.6 : pull * 0.6 }}
      >
        {refreshing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          pull > 8 && (
            <ArrowDown
              className="w-5 h-5 transition-transform"
              style={{ transform: `rotate(${ready ? 180 : 0}deg)` }}
            />
          )
        )}
      </div>
      {children}
    </div>
  );
}