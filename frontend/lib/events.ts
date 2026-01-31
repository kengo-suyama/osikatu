export type CircleChangeDetail = { circleId: string };

/**
 * CIRCLE_CHANGE detail:
 * - 正式: { circleId: string }
 * - 互換: string（旧仕様 / 廃止予定）
 */
export const EVENTS = {
  OSHI_CHANGE: "oshi-change",
  OSHI_PROFILE_CHANGE: "oshi-profile-change",
  CIRCLE_CHANGE: "circle-change",
  HOME_COMPACT_CHANGE: "home-compact-change",
  BIRTHDAY_FX_CHANGE: "birthday-fx-change",
  CELEBRATION_PREFS_CHANGE: "celebration-prefs-change",
} as const;
