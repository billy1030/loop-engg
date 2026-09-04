import React, { useState, useEffect } from "react";
import { Shield, QrCode, Key, Check, AlertCircle, Copy, CheckCircle2, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, refreshUser } = useAuth();
  const [step, setStep] = useState<"status" | "setup" | "verify">("status");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState<string>("");
  const [disableCode, setDisableCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep("status");
      setError(null);
      setSuccessMsg(null);
      setVerifyCode("");
      setDisableCode("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartSetup = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to initiate 2FA setup");
      }
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setRecoveryCodes(data.recoveryCodes || []);
      setStep("setup");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: verifyCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid 2FA code");
      }
      await refreshUser();
      setSuccessMsg("Two-Factor Authentication is now ENABLED on your account!");
      setStep("status");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disableCode.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: disableCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to disable 2FA");
      }
      await refreshUser();
      setSuccessMsg("Two-Factor Authentication has been disabled.");
      setDisableCode("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: "secret" | "codes") => {
    navigator.clipboard.writeText(text);
    if (type === "secret") {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "var(--bg-card, #1e293b)",
          border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
          borderRadius: 12,
          padding: "24px",
          color: "var(--text-main, #f8fafc)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10b981",
              }}
            >
              <Shield size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Two-Factor Authentication (2FA)</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted, #94a3b8)", margin: 0 }}>
                RFC 6238 TOTP Security & Recovery Keys
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted, #94a3b8)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 6,
              padding: "8px 12px",
              color: "#ef4444",
              fontSize: 12,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: 6,
              padding: "8px 12px",
              color: "#10b981",
              fontSize: 12,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle2 size={14} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Status View */}
        {step === "status" && (
          <div>
            <div
              style={{
                background: "var(--bg-secondary, #0f172a)",
                borderRadius: 8,
                padding: "16px",
                border: "1px solid var(--border-color, rgba(255, 255, 255, 0.05))",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Current 2FA Status</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted, #94a3b8)", marginTop: 2 }}>
                    Account: <strong>{currentUser?.username}</strong> (ID: {currentUser?.userNumber})
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: currentUser?.totpEnabled ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                    color: currentUser?.totpEnabled ? "#10b981" : "#ef4444",
                  }}
                >
                  {currentUser?.totpEnabled ? "ENABLED" : "DISABLED"}
                </span>
              </div>
            </div>

            {!currentUser?.totpEnabled ? (
              <div>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: "#cbd5e1" }}>
                  Protect your workspace by requiring an authenticator app code (Google Authenticator, Microsoft Authenticator, 1Password) each time you sign in.
                </p>
                <button
                  onClick={handleStartSetup}
                  disabled={isLoading}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: 6,
                    background: "var(--accent, #2563eb)",
                    color: "#fff",
                    border: "none",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  <QrCode size={16} /> Set Up Authenticator App
                </button>
              </div>
            ) : (
              <form onSubmit={handleDisable2FA}>
                <p style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 12 }}>
                  To disable Two-Factor Authentication, enter a 6-digit code from your authenticator app below:
                </p>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 6,
                      background: "var(--bg-secondary, #0f172a)",
                      border: "1px solid var(--border-color, rgba(255,255,255,0.1))",
                      color: "#fff",
                      fontSize: 14,
                      textAlign: "center",
                      letterSpacing: "2px",
                      outline: "none",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 6,
                      background: "rgba(239, 68, 68, 0.2)",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      color: "#ef4444",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Disable 2FA
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Setup View (QR Code + Recovery Codes) */}
        {step === "setup" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div
                style={{
                  display: "inline-block",
                  padding: 8,
                  background: "#ffffff",
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                {qrCode && <img src={qrCode} alt="2FA QR Code" style={{ width: 160, height: 160, display: "block" }} />}
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted, #94a3b8)", margin: "4px 0" }}>
                Scan this QR code with Google Authenticator or 1Password.
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "#38bdf8",
                  marginTop: 4,
                }}
              >
                <span>Secret: {secret}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(secret, "secret")}
                  style={{ background: "transparent", border: "none", color: "#38bdf8", cursor: "pointer", padding: 2 }}
                >
                  {copiedSecret ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            {/* Emergency Recovery Codes */}
            <div
              style={{
                background: "var(--bg-secondary, #0f172a)",
                borderRadius: 8,
                padding: "12px",
                border: "1px solid var(--border-color, rgba(255, 255, 255, 0.05))",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b", display: "flex", alignItems: "center", gap: 6 }}>
                  <Key size={14} /> Emergency Recovery Codes (Save these!)
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(recoveryCodes.join("\n"), "codes")}
                  style={{
                    fontSize: 11,
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    color: "#f59e0b",
                    padding: "2px 6px",
                    borderRadius: 4,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {copiedCodes ? <Check size={11} /> : <Copy size={11} />} Copy Codes
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "4px 12px",
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "#cbd5e1",
                }}
              >
                {recoveryCodes.map((code, i) => (
                  <div key={i}>{code}</div>
                ))}
              </div>
            </div>

            {/* Verification Form to complete setup */}
            <form onSubmit={handleVerifySetup}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Enter 6-Digit Code from App to Confirm:
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  placeholder="123456"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 6,
                    background: "var(--bg-secondary, #0f172a)",
                    border: "1px solid var(--border-color, rgba(255,255,255,0.1))",
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: 700,
                    textAlign: "center",
                    letterSpacing: "4px",
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 6,
                    background: "#10b981",
                    color: "#fff",
                    border: "none",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Confirm & Enable
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
