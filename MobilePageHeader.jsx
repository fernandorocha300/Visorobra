import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import BackButton from "@/components/BackButton";

// Shows a back button at the top of child screens on mobile only.
export default function MobilePageHeader() {
  const isMobile = useIsMobile();
  if (!isMobile) return null;
  return (
    <div className="mb-2">
      <BackButton fallback="/" />
    </div>
  );
}