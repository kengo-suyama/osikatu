export const LOG_LABELS: Record<string, string> = {
  "chat_message.create": "チャット送信",
  "chat_message.delete": "チャット削除",
  "join_request.create": "参加申請",
  "join_request.approve": "参加承認",
  "join_request.reject": "参加見送り",
  "oshi_media.change_frame": "フレーム変更",
  "circle.ui.theme.update": "サークルテーマ変更",
  "circle.ui.special_bg.update": "フェス背景切替",
  "settlement.create": "精算作成",
  "settlement.update": "精算更新",
};

export function logLabel(action: string): string {
  return LOG_LABELS[action] ?? action;
}
