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

export const ANALYTICS_EVENTS = {
  APP_OPEN: "app_open",
  NAV_HOME: "nav_home",
  NAV_CIRCLE_SEARCH_OPEN: "nav_circle_search_open",
  CIRCLE_CREATE_OPEN: "circle_create_open",
  CIRCLE_CREATE_SUBMIT: "circle_create_submit",
  CIRCLE_JOIN_OPEN: "circle_join_open",
  CIRCLE_JOIN_SUBMIT: "circle_join_submit",
  JOIN_REQUEST_SUBMIT: "join_request_submit",
  JOIN_REQUEST_CANCEL: "join_request_cancel",
  INVITE_CODE_COPY: "invite_code_copy",
  SHARE_X_CLICK: "share_x_click",
  SHARE_LINE_CLICK: "share_line_click",
  SHARE_INSTAGRAM_CLICK: "share_instagram_click",
  SHARE_TIKTOK_CLICK: "share_tiktok_click",
  SHARE_COPY_LINK_CLICK: "share_copy_link_click",
  NAV_CIRCLE_HOME: "nav_circle_home",
  NAV_CHAT_OPEN: "nav_chat_open",
  CHAT_SEND_TEXT: "chat_send_text",
  CHAT_SEND_IMAGE: "chat_send_image",
  CHAT_OPEN_THREAD: "chat_open_thread",
  OWNER_DASHBOARD_OPEN: "owner_dashboard_open",
  OWNER_DASHBOARD_REMIND_ALL: "owner_dashboard_remind_all",
  PLAN_UPGRADE_OPEN: "plan_upgrade_open",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
