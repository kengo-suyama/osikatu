type MaybeProfile = {
  displayName?: string | null;
  avatarUrl?: string | null;
};

export function getSafeDisplayName(profile?: MaybeProfile | null): string {
  const name = (profile?.displayName ?? "").trim();
  return name.length > 0 ? name : "未設定";
}

export function isProfileNameMissing(profile?: MaybeProfile | null): boolean {
  return (profile?.displayName ?? "").trim().length === 0;
}
