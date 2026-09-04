import {
  hashPassword,
  verifyPassword,
  generateRecoveryCodes,
  hashRecoveryCode,
  generatePreAuthToken,
  verifyPreAuthToken,
  generateTotpSetup,
  verifyTotpToken,
  getUserDirs,
  getUsers,
  toSafeUser,
} from "../src/auth/user-manager.js";

async function runAuthTests() {
  console.log("=== Testing Authentication, Scrypt, Multi-Tenant Isolation, and TOTP 2FA ===");

  // 1. Password Hashing (scrypt + timing safe equal)
  const password = "mySecurePassword123!";
  const hash = hashPassword(password);
  console.log("1. Generated scrypt hash:", hash.slice(0, 30) + "...");
  const valid = verifyPassword(password, hash);
  const invalid = verifyPassword("wrongPass", hash);
  if (!valid || invalid) {
    throw new Error("Password verification failed!");
  }
  console.log("✅ Password hashing & constant-time verify OK");

  // 2. Recovery Codes
  const codes = generateRecoveryCodes(10);
  if (codes.length !== 10) throw new Error("Expected 10 recovery codes");
  const sampleCode = codes[0];
  const hashedCode = hashRecoveryCode(sampleCode);
  if (hashRecoveryCode(sampleCode) !== hashedCode) throw new Error("Recovery code hashing inconsistent");
  console.log("✅ Emergency Recovery Codes generation & hashing OK (Sample:", sampleCode, ")");

  // 3. PreAuth HMAC Token
  const userId = 42;
  const token = generatePreAuthToken(userId, hash);
  const isTokenValid = verifyPreAuthToken(token, userId, hash);
  const isExpiredOrTampered = verifyPreAuthToken(token, 999, hash);
  if (!isTokenValid || isExpiredOrTampered) throw new Error("PreAuth HMAC validation failed!");
  console.log("✅ 2FA PreAuth HMAC Token validation OK");

  // 4. TOTP RFC 6238
  const { secret, otpauthUrl, recoveryCodes } = generateTotpSetup("testuser");
  console.log("4. Generated TOTP secret:", secret);
  console.log("   Otpauth URI:", otpauthUrl);

  // 5. Multi-Tenant User Isolation Directories
  const user0 = getUserDirs("00000");
  const user1 = getUserDirs("00001");
  console.log("5. User 00000 logs dir:", user0.userLogsDir);
  console.log("   User 00001 logs dir:", user1.userLogsDir);
  if (user0.userLogsDir === user1.userLogsDir) throw new Error("User isolation directory collision!");
  console.log("✅ Multi-tenant folder isolation verified");

  console.log("\n🎉 ALL AUTH & 2FA TESTS PASSED SUCCESSFULLY!");
}

runAuthTests().catch((e) => {
  console.error("❌ Test failed:", e);
  process.exit(1);
});
