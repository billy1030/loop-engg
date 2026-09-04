export type UserRole = "admin" | "user";

export interface User {
  id: number;
  userNumber: string; // 5 digits, e.g. "00000" (admin), "00001", etc.
  username: string;
  displayName: string;
  passwordHash: string; // "salt:derivedHash"
  role: UserRole;
  isActive: boolean;
  totpSecret?: string | null;
  totpEnabled: boolean;
  pendingTotpSecret?: string | null;
  recoveryCodesHashed: string[];
  pendingRecoveryCodesHashed?: string[];
  usedTotpHashes?: string[];
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface SafeUser {
  id: number;
  userNumber: string;
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  totpEnabled: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface Session {
  userId: number;
  userNumber: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
}

export interface UserContext {
  authUser: SafeUser;
  userNumber: string;
  userLogsDir: string;
  userDocsDir: string;
}
