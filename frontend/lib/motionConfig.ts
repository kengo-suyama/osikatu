export const motionTransition = {
  duration: 0.24,
  ease: "easeOut",
} as const;

export const feedItemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: motionTransition },
} as const;

export const modalOverlayVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: motionTransition },
  exit: { opacity: 0, transition: motionTransition },
} as const;

export const modalContentVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: motionTransition },
  exit: { opacity: 0, y: 24, transition: motionTransition },
} as const;

export const cardMotion = {
  hover: { scale: 1.01 },
  tap: { scale: 0.97 },
} as const;
