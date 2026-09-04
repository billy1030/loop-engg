import React, { useState } from "react";
import { Shield, KeyRound, User, Lock, ArrowRight, AlertCircle, RefreshCw, Key, CheckCircle2 } from "lucide-react";
import { useAuth, type AuthUser } from "../contexts/AuthContext";

interface LoginPageProps {
  onLoginSuccess?: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 2FA Challenge State
  const [isTotpRequired, setIsTotpRequired] = useState(false);
  const [totpUserId, setTotpUserId] = useState<number | null>(null);
  const [preAuthToken, setPreAuthToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [isUsingRecoveryCode, setIsUsingRecoveryCode] = useState(false);

  // Step 1: Username & Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password }),
      });

      let data: any = {};
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        if (text.includes("<!DOCTYPE html>") || text.includes("<html")) {
          throw new Error("Cannot connect to authentication service. Please ensure the backend server is running on port 7009.");
        }
        throw new Error(text || `Server responded with HTTP ${res.status}`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid username or password.");
      }

      if (data.step === "totp_required") {
        setIsTotpRequired(true);
        setTotpUserId(data.userId);
        setPreAuthToken(data.preAuthToken);
      } else if (data.user) {
        login(data.user);
        onLoginSuccess?.(data.user);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: 2FA TOTP Challenge
  const handleTotpChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode.trim() || !totpUserId || !preAuthToken) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/2fa/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: totpUserId,
          code: totpCode.trim(),
          preAuthToken,
        }),
      });

      let data: any = {};
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server responded with HTTP ${res.status}`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "2FA verification failed");
      }

      if (data.user) {
        login(data.user);
        onLoginSuccess?.(data.user);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "2FA verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary, #f8fafc)",
        color: "var(--text-main, #0f172a)",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--bg-secondary, #ffffff)",
          border: "1px solid var(--border-color, #e2e8f0)",
          borderRadius: 16,
          padding: "36px 32px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: "linear-gradient(135deg, var(--accent, #0284c7), var(--accent-purple, #7c3aed))",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
              boxShadow: "0 6px 14px rgba(2, 132, 199, 0.25)",
            }}
          >
            <Shield size={28} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px 0", color: "var(--text-main, #0f172a)", letterSpacing: "-0.02em" }}>
            Mini Chatbot
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted, #64748b)", margin: 0 }}>
            {isTotpRequired ? "Two-Factor Verification Required" : "Sign in to your workspace"}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: 8,
              padding: "10px 12px",
              color: "#dc2626",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {!isTotpRequired ? (
          /* Step 1 Form: Username & Password */
          <form onSubmit={handlePasswordLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-main, #0f172a)", marginBottom: 6 }}>
                Username
              </label>
              <div style={{ position: "relative" }}>
                <User
                  size={16}
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted, #64748b)" }}
                />
                <input
                  type="text"
                  required
                  placeholder="e.g. admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 38px",
                    borderRadius: 8,
                    background: "var(--bg-card, #f1f5f9)",
                    border: "1px solid var(--border-color, #e2e8f0)",
                    color: "var(--text-main, #0f172a)",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-main, #0f172a)", marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted, #64748b)" }}
                />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 38px",
                    borderRadius: 8,
                    background: "var(--bg-card, #f1f5f9)",
                    border: "1px solid var(--border-color, #e2e8f0)",
                    color: "var(--text-main, #0f172a)",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                marginTop: 8,
                padding: "12px 16px",
                borderRadius: 8,
                background: "var(--accent, #0284c7)",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: 14,
                cursor: isLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "opacity 0.15s",
              }}
            >
              {isLoading ? <RefreshCw size={16} className="spin" /> : <>Sign In <ArrowRight size={16} /></>}
            </button>
          </form>
        ) : (
          /* Step 2 Form: 2FA TOTP Challenge */
          <form onSubmit={handleTotpChallenge} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                background: "var(--accent-glow, rgba(2, 132, 199, 0.1))",
                border: "1px solid var(--border-color, #e2e8f0)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 12,
                color: "var(--accent, #0284c7)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <KeyRound size={16} style={{ flexShrink: 0 }} />
              <span>
                {isUsingRecoveryCode
                  ? "Enter one of your 8-character Emergency Recovery Codes."
                  : "Enter the 6-digit code from your Authenticator app (Google, Microsoft, 1Password)."}
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-main, #0f172a)", marginBottom: 6 }}>
                {isUsingRecoveryCode ? "Emergency Recovery Code" : "6-Digit Authenticator Code"}
              </label>
              <div style={{ position: "relative" }}>
                <Key
                  size={16}
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted, #64748b)" }}
                />
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={isUsingRecoveryCode ? 12 : 6}
                  placeholder={isUsingRecoveryCode ? "xxxx-xxxx" : "123456"}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 38px",
                    borderRadius: 8,
                    background: "var(--bg-card, #f1f5f9)",
                    border: "1px solid var(--border-color, #e2e8f0)",
                    color: "var(--text-main, #0f172a)",
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: isUsingRecoveryCode ? "1px" : "4px",
                    textAlign: "center",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                marginTop: 8,
                padding: "12px 16px",
                borderRadius: 8,
                background: "var(--accent-emerald, #16a34a)",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: 14,
                cursor: isLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {isLoading ? <RefreshCw size={16} className="spin" /> : <>Verify & Access Workspace <CheckCircle2 size={16} /></>}
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setIsUsingRecoveryCode(!isUsingRecoveryCode);
                  setTotpCode("");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent, #0284c7)",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                {isUsingRecoveryCode ? "Use 6-digit Authenticator Code" : "Use Emergency Recovery Code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsTotpRequired(false);
                  setTotpCode("");
                  setErrorMessage(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted, #64748b)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Commit ID Badge */}
        <div style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: "var(--text-muted, #64748b)", fontFamily: "monospace" }}>
          ( id: {typeof __COMMIT_HASH__ !== "undefined" ? __COMMIT_HASH__ : "0ab7344"} )
        </div>
      </div>
    </div>
  );
};
