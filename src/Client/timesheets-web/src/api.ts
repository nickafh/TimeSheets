// src/api.ts

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5150";

// --- Token storage ---
const TOKEN_KEY = "timesheets_jwt";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handle401(res: Response): void {
  if (res.status === 401) {
    clearStoredToken();
    window.location.href = "/login";
  }
}

export interface UserDto {
  id: number;
  legacyEmployeeId: number | null;
  firstName: string;
  lastName: string;
  email: string;
  department?: string | null;
  category?: string | null;
  managerName?: string | null;
  /** IDs of users who are managers of this user (multiple managers supported). */
  managerIds?: number[];
  hireDate?: string | null;
  terminationDate?: string | null;
  isActive: number; // 1/0
  isWfh: number; // 1/0
  isPartTime: number; // 1/0
  isIntern: number; // 1/0
  role: string; // Employee, Manager, Admin
  payType: string; // "Salary" | "Hourly"
  exemptionStatus: string; // "Exempt" | "NonExempt"
}

export interface ManagerOptionDto {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string;
}

/** System-wide settings from Admin > System Settings. Used for PTO allowances and rules. */
export interface SystemSettingsDto {
  id: number;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  standardWorkHoursPerDay: number;
  workWeekStartDay: number;
  fiscalYearStartMonth: number;
  defaultPtoAllowance: number;
  ptoAccrualEnabled: boolean;
  ptoAccrualRate: number;
  maxPtoCarryover: number;
  ptoTier1MaxYears: number;
  ptoTier1AnnualDays: number;
  ptoTier2MaxYears: number;
  ptoTier2AnnualDays: number;
  ptoTier3AnnualDays: number;
  requirePtoApproval: boolean;
  minAdvanceNoticeDays: number;
  allowFutureTimeEntries: boolean;
  maxPastEditDays: number;
  requireDailyTimeEntry: boolean;
  lockEntriesAfterApproval: boolean;
  emailNotificationsEnabled: boolean;
  notifyManagerOnPtoRequest: boolean;
  notifyEmployeeOnPtoDecision: boolean;
  sendWeeklyReminders: boolean;
  reminderDayOfWeek: number;
}

export function getSystemSettings(): Promise<SystemSettingsDto> {
  return getJson<SystemSettingsDto>("/api/systemsettings");
}

export function updateSystemSettings(settings: SystemSettingsDto): Promise<SystemSettingsDto> {
  return putJson<SystemSettingsDto>("/api/systemsettings", settings);
}

// --- Clock Punch DTOs ---

export interface ClockPunchDto {
  id: number;
  userId: number;
  punchDate: string;     // ISO date
  punchTime: string;     // ISO datetime
  punchType: string;     // ClockIn, LunchOut, LunchIn, ClockOut
  status: string;        // Active, NeedsAttention, Voided
  originalPunchTime: string | null;
  correctedByUserId: number | null;
  correctedAt: string | null;
}

export interface ClockStatusDto {
  currentState: string;       // "not_started" | "clocked_in" | "lunch_out" | "lunch_in" | "clocked_out"
  validNextActions: string[]; // e.g., ["ClockIn"] or ["LunchOut", "ClockOut"]
  todayPunches: ClockPunchDto[];
  totalHoursToday: number | null;
  clockInTime: string | null;
  lunchMinutes: number | null;
}

export interface NeedsAttentionItemDto {
  userId: number;
  userName: string;
  punchDate: string;
  punches: ClockPunchDto[];
}

export interface DailyTimeEntryDto {
  id: number;
  userId: number;
  workDate: string; // ISO date string
  workedHours: number;
  ptoHours: number;
  dayType: string;
  notes?: string | null;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    handle401(res);
    const text = await res.text();
    let msg = `GET ${path} failed: ${res.status}`;
    try {
      const body = JSON.parse(text) as { message?: string; hint?: string };
      if (body?.message) msg += ` - ${body.message}`;
      if (body?.hint) msg += ` (${body.hint})`;
    } catch {
      // ignore parse error
    }
    throw new Error(msg);
  }
  const text = await res.text();
  return JSON.parse(text) as T;
}

async function parseErrorResponse(res: Response, prefix: string): Promise<never> {
  const text = await res.text();
  let msg = prefix;
  try {
    const body = JSON.parse(text) as { message?: string; hint?: string };
    if (body?.message) msg = body.message;
    if (body?.hint) msg += ` (${body.hint})`;
  } catch {
    // ignore parse error
  }
  throw new Error(msg);
}

async function putJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    handle401(res);
    await parseErrorResponse(res, `PUT ${path} failed: ${res.status}`);
  }
  return res.status === 204 ? ({} as T) : res.json();
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    handle401(res);
    await parseErrorResponse(res, `POST ${path} failed: ${res.status}`);
  }
  return res.json();
}

async function patchJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    handle401(res);
    await parseErrorResponse(res, `PATCH ${path} failed: ${res.status}`);
  }
  return res.status === 204 ? ({} as T) : res.json();
}

async function deleteJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    handle401(res);
    await parseErrorResponse(res, `DELETE ${path} failed: ${res.status}`);
  }
  return res.status === 204 ? ({} as T) : res.json();
}

export function fetchUsers(includeInactive = false): Promise<UserDto[]> {
  const params = includeInactive ? "?includeInactive=true" : "";
  return getJson<UserDto[]>(`/api/users${params}`);
}

export function fetchUserById(id: number): Promise<UserDto> {
  return getJson<UserDto>(`/api/users/${id}`);
}

export function createUser(user: Omit<UserDto, "id">): Promise<UserDto> {
  return postJson<UserDto>("/api/users", user);
}

export function updateUser(id: number, user: UserDto): Promise<UserDto> {
  return putJson<UserDto>(`/api/users/${id}`, user);
}

export function deactivateUser(id: number): Promise<UserDto> {
  return patchJson<UserDto>(`/api/users/${id}/deactivate`);
}

export function activateUser(id: number): Promise<UserDto> {
  return patchJson<UserDto>(`/api/users/${id}/activate`);
}

export function deleteUser(id: number): Promise<void> {
  return deleteJson<void>(`/api/users/${id}`);
}

export function setUserPassword(userId: number, password: string): Promise<void> {
  return putJson<void>(`/api/users/${userId}/password`, { password });
}

/** Users who can be assigned as managers (Role = Manager or Admin). */
export function fetchManagers(): Promise<ManagerOptionDto[]> {
  return getJson<ManagerOptionDto[]>("/api/users/managers");
}

/** Distinct department and category values for dropdowns. */
export function fetchDepartmentAndCategoryLookup(): Promise<{ departments: string[]; categories: string[] }> {
  return getJson<{ departments: string[]; categories: string[] }>("/api/users/lookup");
}

/** Set the list of managers for a user. Only Manager/Admin users can be assigned. */
export function updateUserManagers(userId: number, managerIds: number[]): Promise<{ managerIds: number[] }> {
  return putJson<{ managerIds: number[] }>(`/api/users/${userId}/managers`, { managerIds });
}

export function fetchDailyTimeEntries(
  userId: number,
  start: string,
  end: string
): Promise<DailyTimeEntryDto[]> {
  const params = new URLSearchParams({
    userId: String(userId),
    start,
    end,
  });
  return getJson<DailyTimeEntryDto[]>(
    `/api/DailyTimeEntries?${params.toString()}`
  );
}

export function saveDailyTimeEntriesBulk(
  entries: DailyTimeEntryDto[]
): Promise<void> {
  return putJson<void>("/api/DailyTimeEntries/bulk", entries);
}

// --- Clock Punch API helpers ---

/** Record a clock punch (ClockIn, LunchOut, LunchIn, ClockOut) */
export function recordPunch(punchType: string): Promise<ClockStatusDto> {
  return postJson<ClockStatusDto>("/api/clockpunches/punch", { punchType });
}

/** Get current clock status for a user (defaults to current user) */
export function fetchClockStatus(userId?: number): Promise<ClockStatusDto> {
  const query = userId ? `?userId=${userId}` : "";
  return getJson<ClockStatusDto>(`/api/clockpunches/status${query}`);
}

/** Undo the last punch within the undo window */
export function undoLastPunch(punchId: number): Promise<ClockStatusDto> {
  return deleteJson<ClockStatusDto>(`/api/clockpunches/${punchId}/undo`);
}

/** Get punches needing attention (manager/admin only) */
export function fetchNeedsAttention(): Promise<NeedsAttentionItemDto[]> {
  return getJson<NeedsAttentionItemDto[]>("/api/clockpunches/needs-attention");
}

/** Correct a punch time (manager/admin only) */
export function correctPunchTime(punchId: number, correctedPunchTime: string): Promise<ClockPunchDto> {
  return putJson<ClockPunchDto>(`/api/clockpunches/${punchId}/correct`, { correctedPunchTime });
}

/** Add a missing punch for a user (manager/admin only) */
export function addMissingPunch(userId: number, punchDate: string, punchType: string, punchTime: string): Promise<ClockPunchDto> {
  return postJson<ClockPunchDto>("/api/clockpunches/add-missing", { userId, punchDate: punchDate + "T00:00:00", punchType, punchTime });
}

/** Get current user's own incomplete (NeedsAttention) punch days */
export interface MyIncompleteItemDto {
  punchDate: string;
  punches: { id: number; punchType: string; punchTime: string; status: string }[];
}

export function fetchMyIncompleteEntries(): Promise<MyIncompleteItemDto[]> {
  return getJson<MyIncompleteItemDto[]>("/api/clockpunches/my-incomplete");
}

/** Get punch history for a date range */
export function fetchPunchHistory(userId: number, start: string, end: string): Promise<ClockPunchDto[]> {
  return getJson<ClockPunchDto[]>(`/api/clockpunches/history?userId=${userId}&start=${start}&end=${end}`);
}

export interface TeamTimeEntryDto {
  id: number;
  userId: number;
  userName: string;
  department: string | null;
  workDate: string;
  workedHours: number;
  ptoHours: number;
  dayType: string;
  notes: string | null;
}

export interface WeeklySummaryDto {
  userId: number;
  userName: string;
  department: string | null;
  totalWorkedHours: number;
  totalPtoHours: number;
  totalHours: number;
  daysWorked: number;
  daysPto: number;
}

export function fetchTeamTimeEntries(
  start: string,
  end: string
): Promise<TeamTimeEntryDto[]> {
  const params = new URLSearchParams({ start, end });
  return getJson<TeamTimeEntryDto[]>(`/api/DailyTimeEntries/team?${params.toString()}`);
}

export function fetchWeeklySummary(weekStart: string): Promise<WeeklySummaryDto[]> {
  const params = new URLSearchParams({ weekStart });
  return getJson<WeeklySummaryDto[]>(`/api/DailyTimeEntries/summary?${params.toString()}`);
}

export interface HolidayDto {
  id: number;
  name: string;
  holidayDate: string; // ISO date string
}

export interface PtoRequestWithUserDto {
  id: number;
  userId: number;
  userName: string;
  department: string | null;
  dateOfLeave: string; // ISO date string (start date)
  endDate?: string | null; // ISO date string; if set, request spans multiple days
  hours: number;
  reason: string | null;
  ptoTypeId: number;
  status: number; // 0 = Pending, 1 = Approved, 2 = Denied
  requestedAt: string;
  approvedDeniedAt: string | null;
  approvedDeniedBy: number | null;
  denyReason: string | null;
}

export interface CreatePtoRequestDto {
  userId: number;
  dateOfLeave: string; // ISO date (start)
  endDate?: string | null; // ISO date (end); omit or same as start = single day
  hours: number;
  reason?: string | null;
  ptoTypeId: number;
}

export function fetchHolidays(): Promise<HolidayDto[]> {
  return getJson<HolidayDto[]>("/api/holidays");
}

export function createHoliday(holiday: Omit<HolidayDto, "id">): Promise<HolidayDto> {
  return postJson<HolidayDto>("/api/holidays", holiday);
}

export function updateHoliday(id: number, holiday: HolidayDto): Promise<HolidayDto> {
  return putJson<HolidayDto>(`/api/holidays/${id}`, holiday);
}

export function deleteHoliday(id: number): Promise<void> {
  return deleteJson<void>(`/api/holidays/${id}`);
}

/** Format PTO request date(s) for display: "Dec 20 – Dec 24" when range, else "Dec 20, 2024". */
export function formatPtoRequestDateDisplay(
  r: { dateOfLeave: string; endDate?: string | null }
): string {
  const start = new Date(r.dateOfLeave);
  const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (r.endDate) {
    const end = new Date(r.endDate);
    if (end > start) {
      return `${startStr} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
  }
  return startStr;
}

export function createPtoRequest(request: CreatePtoRequestDto): Promise<PtoRequestWithUserDto> {
  return postJson<PtoRequestWithUserDto>("/api/ptorequests", {
    userId: request.userId,
    dateOfLeave: request.dateOfLeave,
    endDate: request.endDate || null,
    hours: request.hours,
    reason: request.reason ?? null,
    ptoTypeId: request.ptoTypeId,
  });
}

export function fetchAllPtoRequests(): Promise<PtoRequestWithUserDto[]> {
  return getJson<PtoRequestWithUserDto[]>("/api/ptorequests/all");
}

export function fetchManagerPendingPtoRequests(): Promise<PtoRequestWithUserDto[]> {
  return getJson<PtoRequestWithUserDto[]>("/api/ptorequests/manager/pending");
}

export function fetchManagerPtoHistory(status?: number): Promise<PtoRequestWithUserDto[]> {
  const params = status !== undefined ? `?status=${status}` : "";
  return getJson<PtoRequestWithUserDto[]>(`/api/ptorequests/manager/history${params}`);
}

export function fetchPendingPtoRequests(): Promise<PtoRequestWithUserDto[]> {
  return getJson<PtoRequestWithUserDto[]>("/api/ptorequests/pending");
}

export function fetchPtoHistory(status?: number): Promise<PtoRequestWithUserDto[]> {
  const params = status !== undefined ? `?status=${status}` : "";
  return getJson<PtoRequestWithUserDto[]>(`/api/ptorequests/history${params}`);
}

export function approvePtoRequest(id: number, approvedBy: number): Promise<void> {
  return patchJson<void>(`/api/ptorequests/${id}/approve?approvedBy=${approvedBy}`);
}

export function denyPtoRequest(id: number, deniedBy: number, reason?: string): Promise<void> {
  return patchJson<void>(`/api/ptorequests/${id}/deny?deniedBy=${deniedBy}`, { reason });
}

export function cancelPtoRequest(id: number): Promise<void> {
  return deleteJson<void>(`/api/ptorequests/${id}`);
}

// Notifications
export interface NotificationDto {
  id: number;
  title: string;
  message: string;
  createdAt: string; // ISO date string
  expiresAt: string | null;
  isActive: number; // 1/0
  createdByUserId: number;
}

export function fetchActiveNotifications(): Promise<NotificationDto[]> {
  return getJson<NotificationDto[]>("/api/notifications");
}

export function fetchAllNotifications(): Promise<NotificationDto[]> {
  return getJson<NotificationDto[]>("/api/notifications/all");
}

export function createNotification(
  notification: Omit<NotificationDto, "id" | "createdAt">
): Promise<NotificationDto> {
  return postJson<NotificationDto>("/api/notifications", notification);
}

export function updateNotification(
  id: number,
  notification: NotificationDto
): Promise<NotificationDto> {
  return putJson<NotificationDto>(`/api/notifications/${id}`, notification);
}

export function deactivateNotification(id: number): Promise<NotificationDto> {
  return patchJson<NotificationDto>(`/api/notifications/${id}/deactivate`);
}

export function activateNotification(id: number): Promise<NotificationDto> {
  return patchJson<NotificationDto>(`/api/notifications/${id}/activate`);
}

export function deleteNotification(id: number): Promise<void> {
  return deleteJson<void>(`/api/notifications/${id}`);
}

// Early Closures
export interface EarlyClosureDto {
  id: number;
  name: string;
  closureDate: string; // ISO date string
  closeTime: string; // e.g., "2:00 PM"
}

export function fetchEarlyClosures(): Promise<EarlyClosureDto[]> {
  return getJson<EarlyClosureDto[]>("/api/earlyclosures");
}

export function createEarlyClosure(
  closure: Omit<EarlyClosureDto, "id">
): Promise<EarlyClosureDto> {
  return postJson<EarlyClosureDto>("/api/earlyclosures", closure);
}

export function updateEarlyClosure(
  id: number,
  closure: EarlyClosureDto
): Promise<EarlyClosureDto> {
  return putJson<EarlyClosureDto>(`/api/earlyclosures/${id}`, closure);
}

export function deleteEarlyClosure(id: number): Promise<void> {
  return deleteJson<void>(`/api/earlyclosures/${id}`);
}

// PTO Balance Types
export interface PtoTypeBalance {
  typeName: string;
  hoursAllowed: number;
  hoursApproved: number;
  hoursRemaining: number;
}

export interface UserPtoSummary {
  userId: number;
  year: number;
  balances: PtoTypeBalance[];
  totalAllowed: number;
  totalApproved: number;
  totalRemaining: number;
  /** Paid Time Off (type 1) only - for "Available PTO" display. */
  paidTimeOffRemaining: number;
  nextApprovedTimeOff: PtoRequestWithUserDto | null;
  /** Current tenure tier (1, 2, or 3). */
  currentTier: number;
  /** Annual PTO allowance in hours based on tenure tier. */
  annualAllowanceHours: number;
  /** True if the user is in their first calendar year and accruing PTO per pay period. */
  isFirstYearAccrual: boolean;
  /** Hours accrued so far (only relevant when isFirstYearAccrual is true). */
  accruedHours: number;
}

// Fetch PTO requests for a specific user
export function fetchUserPtoRequests(userId: number): Promise<PtoRequestWithUserDto[]> {
  return getJson<PtoRequestWithUserDto[]>(`/api/ptorequests/user/${userId}`);
}

export function fetchMyTeamUsers(): Promise<UserDto[]> {
  return getJson<UserDto[]>("/api/users/team");
}

// Fetch PTO summary from the backend (server-side calculation)
export function fetchUserPtoSummary(userId: number, year: number): Promise<UserPtoSummary> {
  return getJson<UserPtoSummary>(`/api/ptorequests/summary/${userId}?year=${year}`);
}

// --- Auth API ---

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  payType: string;
  exemptionStatus: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function loginWithCredentials(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? "Login failed");
  }
  return res.json();
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    handle401(res);
    throw new Error("Not authenticated");
  }
  return res.json();
}

// --- Calendar feed ---

export async function fetchCalendarToken(): Promise<string> {
  const data = await getJson<{ token: string }>("/api/calendar/token");
  return data.token;
}
