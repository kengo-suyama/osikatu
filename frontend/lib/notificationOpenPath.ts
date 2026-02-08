/**
 * Resolve the open path for a notification.
 * Falls back to /notifications if openPath is missing or invalid.
 */
export function resolveNotificationOpenPath(openPath: string | null | undefined): string {
  if (!openPath || openPath.trim() === "") {
    return "/notifications";
  }
  // Validate it starts with /
  if (!openPath.startsWith("/")) {
    return "/notifications";
  }
  return openPath;
}
