export type ISODate = string; // "YYYY-MM-DD"
export type ISODateTime = string; // ISO 8601

export type Plan = "free" | "premium" | "plus";
export type PlanStatus = "active" | "canceled";

export type ApiSuccess<T, M = unknown> = {
  success: {
    data: T;
    meta?: M;
  };
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type BudgetDto = {
  yearMonth: string;
  budget: number;
  spent: number;
  updatedAt: string | null;
};

export type ScheduleDto = {
  id: string;
  title: string;
  startAt: string;
  endAt?: string | null;
  isAllDay: boolean;
  note?: string | null;
  location?: string | null;
  remindAt?: string | null;
  updatedAt: string;
};

export type UserScheduleDto = {
  id: string;
  title: string;
  startAt: ISODateTime;
  endAt: ISODateTime | null;
  isAllDay: boolean;
  note: string | null;
  location: string | null;
  remindAt: ISODateTime | null;
  updatedAt: ISODateTime | null;
};

export type UserScheduleListDto = {
  items: UserScheduleDto[];
};

export type CircleScheduleParticipantDto = {
  userId: number;
  status: string;
  readAt: ISODateTime | null;
};

export type CircleScheduleDto = {
  id: string;
  circleId: number;
  title: string;
  startAt: ISODateTime;
  endAt: ISODateTime | null;
  isAllDay: boolean;
  note: string | null;
  location: string | null;
  participants?: CircleScheduleParticipantDto[];
  updatedAt: ISODateTime | null;
};

export type CircleScheduleCreateRequest = {
  title: string;
  startAt: ISODateTime;
  endAt?: ISODateTime | null;
  isAllDay?: boolean;
  note?: string | null;
  location?: string | null;
  participantUserIds?: number[];
};

export type CircleScheduleListDto = {
  items: CircleScheduleDto[];
};

export type ScheduleProposalStatus = "pending" | "approved" | "rejected" | "canceled";

export type ScheduleProposalDto = {
  id: number;
  circleId: number;
  createdByMemberId: number;
  title: string;
  startAt: ISODateTime;
  endAt: ISODateTime | null;
  isAllDay: boolean;
  note: string | null;
  location: string | null;
  status: ScheduleProposalStatus;
  reviewedByMemberId: number | null;
  reviewedAt: ISODateTime | null;
  reviewComment: string | null;
  approvedScheduleId: string | null;
  createdAt: ISODateTime;
};

export type ScheduleProposalListDto = {
  items: ScheduleProposalDto[];
};

export type NotificationDto = {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  notifyAt: ISODateTime | null;
  readAt: ISODateTime | null;
  createdAt: ISODateTime | null;
  sourceType: string | null;
  sourceId: number | null;
  sourceMeta: Record<string, unknown> | null;
  openPath: string | null;
};

export type NotificationsResponse = {
  items: NotificationDto[];
  nextCursor: string | null;
};

export type ApiEnvelope<T> = ApiSuccess<T>;

export type ApiErrorEnvelope = ApiError;

/** ---- User / Auth ---- */
export type CelebrationStyle = "sparkle" | "idol" | "kawaii";
export type CelebrationIntensity = "low" | "mid" | "high" | "max";

export type CelebrationPrefs = {
  enabled: boolean;
  style: CelebrationStyle;
  intensity: CelebrationIntensity;
  muteAfterShown: boolean; // 1日1回だけ自動表示にして、以後は手動ボタンで再演出
};

export type UserProfile = {
  birthday?: ISODate | null;
  celebrationPrefs?: CelebrationPrefs;
};

export type UserDTO = {
  id: number;
  name: string;
  email: string;
  plan: Plan;
  planStatus?: PlanStatus;
  profile?: UserProfile;
};

export type AuthResponse = {
  token: string;
  user: UserDTO;
};

export type MeDto = {
  id: number;
  userId: number | null;
  deviceId: string | null;
  role: "guest" | "user";
  name: string;
  email: string;
  plan: Plan;
  planStatus?: PlanStatus;
  effectivePlan: Plan;
  trialEndsAt: ISODateTime | null;
  trialActive?: boolean;
  trialRemainingDays?: number;
  profile?: MeProfileDto;
  ui?: {
    themeId?: string | null;
    specialBgEnabled?: boolean;
  };
};

export type MeProfileDto = {
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  prefectureCode: number | null;
  onboardingCompleted: boolean;
};

/** ---- Circles ---- */
export type CircleDTO = {
  id: number;
  name: string;
  description: string | null;
  oshiLabel?: string | null;
  oshiTag: string | null;
  oshiTags?: string[];
  isPublic?: boolean;
  joinPolicy?: "request" | "instant";
  approvalRequired?: boolean;
  iconUrl: string | null;
  maxMembers: number | null;
  memberCount: number;
  planRequired?: Plan;
  lastActivityAt?: ISODateTime | null;
  ui?: {
    circleThemeId?: string | null;
    specialBgEnabled?: boolean;
    specialBgVariant?: string | null;
  };
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type InviteType = "code" | "link";

export type CircleInviteDTO = {
  id: number;
  circleId: number;
  type: InviteType;
  code: string | null; // 8 chars
  inviteUrl: string | null;
  role?: Role;
  expiresAt: ISODateTime | null;
  revokedAt?: ISODateTime | null;
  createdAt: ISODateTime;
};

/** ---- Feed ---- */
export type UserMiniDTO = { id: number; name: string };

export type PostMediaDTO = {
  id: number;
  type: "image";
  url: string | null;
};

export type CirclePostDTO = {
  id: number;
  circleId: number;
  author: UserMiniDTO;
  body: string;
  tags: string[];
  media: PostMediaDTO[];
  likeCount: number;
  likedByMe: boolean;
  isPinned: boolean;
  createdAt: ISODateTime;
};

/** ---- MVP DTO (Circle/Invite/Post) ---- */
export type CircleDto = {
  id: number;
  name: string;
  description: string | null;
  oshiLabel?: string | null;
  oshiTag: string | null;
  oshiTags?: string[];
  isPublic?: boolean;
  joinPolicy?: "request" | "instant";
  approvalRequired?: boolean;
  iconUrl: string | null;
  maxMembers: number | null;
  memberCount: number;
  myRole?: Role;
  planRequired?: Plan;
  lastActivityAt?: string | null;
  ui?: {
    circleThemeId?: string | null;
    specialBgEnabled?: boolean;
    specialBgVariant?: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type InviteDto = {
  id: number;
  circleId: number;
  code: string;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  role?: Role;
  revokedAt?: string | null;
  createdAt: string;
};

export type PostAuthorDto = {
  id: number;
  name: string;
  avatarUrl?: string | null;
};

export type PostMediaDto = {
  id: number;
  type: "image" | "video";
  url: string;
};

export type PostDto = {
  id: string | number;
  circleId: number;
  author: PostAuthorDto;
  user?: PostAuthorDto;
  source?: "chat" | "legacy";
  postType?: "post" | "chat" | "system";
  body: string;
  messageType?: "text" | "stamp" | "media";
  stampId?: string | null;
  tags: string[];
  media: PostMediaDto[];
  imageUrl?: string | null;
  likeCount: number;
  likedByMe: boolean;
  isPinned: boolean;
  pinKind?: "reminder" | "deadline" | "info" | null;
  pinDueAt?: string | null;
  ackCount?: number;
  ackedByMe?: boolean;
  deletedAt?: string | null;
  createdAt: string;
};

export type CirclePinDto = {
  id: number;
  circleId: number | null;
  createdByMemberId: number | null;
  title: string;
  url: string | null;
  body: string;
  checklistJson: unknown | null;
  sortOrder: number | null;
  pinnedAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  sourcePostId: number | null;
};

/** ---- Oshi DTO (API) ---- */
export type OshiDto = {
  id: number;
  name: string;
  category: string | null;
  isPrimary: boolean;
  nickname: string | null;
  birthday: string | null;
  heightCm: number | null;
  weightKg: number | null;
  bloodType: string | null;
  accentColor: string | null;
  origin: string | null;
  role: string | null;
  charmPoint: string | null;
  quote: string | null;
  hobbies: string[];
  likes: string[];
  dislikes: string[];
  skills: string[];
  favoriteFoods: string[];
  weakPoints: string[];
  supplyTags: string[];
  anniversaries: any[];
  links: any[];
  customFields: any[];
  memo: string | null;
  imageUrl: string | null;
  imageFrameId?: string | null;
  updatedAt: string | null;
};

export type CursorMeta = { nextCursor: string | null };

/** ---- Owner Dashboard ---- */
export type Role = "owner" | "admin" | "member";

export type MemberBriefDto = {
  id: number;
  userId?: number;
  nickname: string | null;
  avatarUrl: string | null;
  initial: string | null;
  role: Role;
};

export type OwnerDashboardCountsDto = {
  unconfirmed: number;
  unpaid: number;
  rsvpPending: number;
};

export type UnpaidMemberDto = {
  member: MemberBriefDto;
  amountYen: number;
};

export type OwnerDashboardDto = {
  circleId: number;
  myRole: Role;
  nextDeadline: {
    kind: string;
    title: string;
    at: ISODateTime;
    remainingMinutes: number;
  } | null;
  counts: OwnerDashboardCountsDto;
  unconfirmedMembers: MemberBriefDto[];
  unpaidMembers: UnpaidMemberDto[];
  rsvpPendingMembers: MemberBriefDto[];
  joinRequests?: JoinRequestDto[];
  pinnedPost?: PostDto | null;
};

export type JoinRequestDto = {
  id: number;
  member: MemberBriefDto;
  message?: string | null;
  status: "pending" | "approved" | "rejected";
  requestedAt?: string | null;
};

/** ---- Oshi Actions ---- */
export type OshiActionTodayDto = {
  dateKey: string;
  actionText: string;
  completed: boolean;
  completedAt: ISODateTime | null;
  currentTitleId?: string | null;
  actionTotal?: number;
  streak?: number;
};

export type TitleAwardDto = {
  id: number;
  titleId: string;
  reason: "action" | "streak" | "days_total";
  meta?: Record<string, unknown>;
  awardedAt: ISODateTime | null;
};

export type OshiActionCompleteDto = {
  dateKey: string;
  actionText: string;
  completedAt: ISODateTime | null;
  awardedTitleId: string | null;
  currentTitleId: string | null;
  actionTotal: number;
  streak: number;
  awards?: TitleAwardDto[];
};

export type TitlesResponseDto = {
  currentTitleId: string | null;
  actionTotal: number;
  streak: number;
  awards: TitleAwardDto[];
};

/** ---- Points ---- */
export type PointsEarnReason = "share_copy" | "daily_login";

export type PointsTransactionItemDto = {
  id: number;
  circleId: number | null;
  delta: number;
  reason: string;
  sourceMeta?: Record<string, unknown> | null;
  requestId?: string | null;
  createdAt: ISODateTime | null;
};

export type MePointsResponseDto = {
  balance: number;
  items: PointsTransactionItemDto[];
};

export type PointsEarnResponseDto = {
  earned: boolean;
  delta: number;
  balance: number;
};

/** ---- Inventory / Unlocks ---- */
export type UnlockItemType = "frame" | "theme" | "title" | "sticker";

export type InventoryItemDto = {
  id: number;
  itemType: UnlockItemType;
  itemKey: string;
  rarity: string;
  source: string;
  acquiredAt: ISODateTime | null;
};

export type MeInventoryResponseDto = {
  balance: number;
  items: InventoryItemDto[];
};

export type InventoryApplyRequestDto = {
  itemType: "frame" | "theme";
  itemKey: string;
};

export type InventoryApplyResponseDto = {
  applied: {
    themeId?: string | null;
    oshiId?: number;
    imageFrameId?: string | null;
  };
};

/** ---- Home Media ---- */
export type HomeMediaItemDto = {
  type: "image" | "video";
  url: string;
  mime?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  updatedAt?: ISODateTime | null;
};

export type MeHomeMediaResponseDto = {
  item: HomeMediaItemDto | null;
};

/** ---- User Album ---- */
export type UserAlbumMediaDto = {
  id: string;
  type: "image" | "video";
  url: string;
  name?: string | null;
  mime?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
};

export type UserAlbumItemDto = {
  id: number;
  date: ISODate | null;
  note: string | null;
  media: UserAlbumMediaDto[];
  createdAt: ISODateTime | null;
};

export type UserAlbumListDto = {
  items: UserAlbumItemDto[];
};

export type UserAlbumDeleteResponseDto = {
  deleted: boolean;
};

/** ---- Circle Media / Album ---- */
export type CircleMediaDto = {
  id: number;
  circleId: number;
  type: "image" | "video";
  url: string;
  mime?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  caption?: string | null;
  createdAt: ISODateTime | null;
};

export type CircleMediaListDto = {
  items: CircleMediaDto[];
};

export type CircleAnnouncementDto = {
  circleId: number;
  text: string | null;
  updatedAt: ISODateTime | null;
  updatedBy?: MemberBriefDto | null;
};

/** ---- Settlement ---- */
export type SettlementParticipantDto = {
  id: number;
  userId: number;
  shareAmount: number;
  isPayer: boolean;
};

export type SettlementTransferDto = {
  id: number;
  fromUserId: number;
  toUserId: number;
  amount: number;
  status: string;
};

export type SettlementDto = {
  id: number;
  circleId: number;
  title: string;
  amount: number;
  currency: string;
  settledAt: string | null;
  splitMode: string;
  participantCount: number;
  transferCount: number;
  createdByUserId: number;
  participants: SettlementParticipantDto[];
  transfers: SettlementTransferDto[];
  createdAt: string;
};

export type SettlementListDto = {
  items: SettlementDto[];
  members: MemberBriefDto[];
};

/** ---- Settlement Expenses (Ledger-style) ---- */
export type CircleSettlementExpenseShareDto = {
  memberId: number;
  memberSnapshotName: string;
  shareYen: number;
};

export type CircleSettlementExpenseDto = {
  id: number;
  circleId: number;
  createdBy: number;
  payerMemberId: number;
  title: string;
  amountYen: number;
  splitType: "equal" | "fixed" | string;
  occurredOn: ISODate | null;
  note: string | null;
  status: "active" | "void" | string;
  voidedAt: ISODateTime | null;
  voidedByMemberId: number | null;
  replacedByExpenseId: number | null;
  replacesExpenseId: number | null;
  shares: CircleSettlementExpenseShareDto[];
  createdAt: ISODateTime | null;
};

export type CircleSettlementExpenseListDto = {
  items: CircleSettlementExpenseDto[];
  nextCursor: string | null;
};

export type CircleSettlementBalanceItemDto = {
  memberId: number;
  displayName: string;
  paidYen: number;
  owedYen: number;
  netYen: number;
};

export type CircleSettlementBalancesDto = {
  items: CircleSettlementBalanceItemDto[];
  totals: {
    totalExpensesYen: number;
    expenseCount: number;
  };
};

export type CircleSettlementSuggestionDto = {
  fromMemberId: number;
  toMemberId: number;
  amountYen: number;
};

export type CircleSettlementSuggestionsDto = {
  items: CircleSettlementSuggestionDto[];
  generatedAt: ISODateTime;
};

/** ---- Billing ---- */
export type PlanQuotas = {
  oshiMax: number | null;
  scheduleMax: number | null;
  albumMax: number | null;
  chatMonthly: number | null;
};

export type PlanFeatures = {
  adsEnabled: boolean;
  chatImage: boolean;
  chatVideo: boolean;
  albumVideo: boolean;
  circlePins: number;
  ownerDashboard: boolean;
};

export type PlanStatusDto = {
  plan: Plan;
  effectivePlan?: Plan;
  planStatus: PlanStatus;
  trialEndsAt: ISODateTime | null;
  quotas?: PlanQuotas;
  features?: PlanFeatures;
};

/** ---- Operation Logs ---- */
export type OperationLogDto = {
  id: string; // "lg_..."
  action: string;
  circleId: string | null;
  actorUserId: number | null;
  targetType: string | null;
  targetId: string | null;
  meta: Record<string, unknown>;
  createdAt: ISODateTime;
};

export type OperationLogListDto = {
  items: OperationLogDto[];
  nextCursor: string | null;
};

/** ---- Diary ---- */
export type DiaryAttachmentDto = {
  id: number;
  url: string;
  fileType: string;
};

export type DiaryDto = {
  id: number;
  userId: number;
  oshiId: number;
  title: string;
  content: string;
  diaryDate: ISODate | null;
  isLocked: boolean;
  tags: string[];
  attachments: DiaryAttachmentDto[];
  createdAt: ISODateTime | null;
  updatedAt: ISODateTime | null;
};

/** ---- Fortune ---- */
/** ---- Expenses ---- */
export type ExpensesByOshiDto = {
  oshiId: number;
  oshiName: string;
  totalAmount: number;
};

export type ExpensesSummaryDto = {
  month: string;
  period: { start: string; end: string };
  totalAmount: number;
  byOshi: ExpensesByOshiDto[];
};

export type FortuneDto = {
  date: string;
  luckScore: number;
  luckyColor: string;
  luckyItem: string;
  message: string;
  goodAction: string;
  badAction: string;
  updatedAt: string | null;
};

/** ---- Pins ---- */
export type PinType = "deadline" | "result" | "payment" | "ticket" | "note";

export type CirclePinDTO = {
  id: number;
  circleId: number;
  type: PinType;
  title: string;
  dueAt: ISODateTime | null;
  isDone: boolean;
  payload: Record<string, unknown> | null;
  createdAt: ISODateTime;
  pinnedAt: ISODateTime;
};

/** ---- Events ---- */
export type CircleEventType =
  | "live"
  | "stream"
  | "lottery"
  | "payment"
  | "ticket"
  | "trip"
  | "goods";
export type Importance = "high" | "med" | "low";

export type CircleEventDTO = {
  id: number;
  circleId: number;
  type: CircleEventType;
  title: string;
  startAt: ISODateTime;
  endAt: ISODateTime | null;
  importance: Importance;
  note: string | null;
  createdAt: ISODateTime;
};

/** ---- Todos ---- */
export type CircleTodoDTO = {
  id: number;
  circleId: number;
  title: string;
  done: boolean;
  dueAt: ISODateTime | null;
  createdAt: ISODateTime;
};

/** ---- Celebration (UI演出) ---- */
export type CelebrationKind =
  | "oshi_birthday"
  | "user_birthday"
  | "christmas"
  | "newyear"
  | "valentine"
  | "whiteday"
  | "anniversary"; // 任意記念日（推し/ユーザー/サークル）

export type CelebrationTheme = {
  kind: CelebrationKind;
  title: string;
  subtitle?: string;
  style: CelebrationStyle;
  intensity: CelebrationIntensity;
  // “一度だけ自動で出す”判定用キー（例: celebration:christmas:2026-12-25）
  onceKey: string;
  // 期間イベント（年末年始など）の開始/終了
  activeFrom: ISODateTime;
  activeTo: ISODateTime;
};
