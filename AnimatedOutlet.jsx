import React from "react";
import { useLocation, useNavigationType, Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

// Directional page transitions: forward navigations (PUSH) slide in from the
// right; back navigations (POP) slide in from the left. REPLACE fades.
const variants = {
  enter: (dir) => ({ x: dir > 0 ? "100%" : dir < 0 ? "-100%" : "0%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? "-100%" : dir < 0 ? "100%" : "0%", opacity: 0 }),
};

export default function AnimatedOutlet({ context }) {
  const location = useLocation();
  const navType = useNavigationType();
  const direction = navType === "POP" ? -1 : navType === "PUSH" ? 1 : 0;

  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={location.pathname}
        custom={direction}
        initial="enter"
        animate="center"
        exit="exit"
        variants={variants}
        transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
        className="min-h-full overflow-x-hidden"
      >
        <Outlet context={context} />
      </motion.div>
    </AnimatePresence>
  );
}