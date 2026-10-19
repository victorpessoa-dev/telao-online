"use client";

import { Suspense } from "react";
import {
  motion,
  MotionConfig,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";
import { usePathname } from "next/navigation";

function RouteMotion({ children }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scrollProgress = useSpring(scrollYProgress, {
    damping: 28,
    stiffness: 180,
    restDelta: 0.001,
  });

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-[100] h-1 origin-left bg-primary"
        style={{ scaleX: scrollProgress }}
      />
      <motion.div
        key={pathname}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.26, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </>
  );
}

export default function AppMotion({ children }) {
  return (
    <MotionConfig reducedMotion="user">
      <Suspense fallback={children}>
        <RouteMotion>{children}</RouteMotion>
      </Suspense>
    </MotionConfig>
  );
}
