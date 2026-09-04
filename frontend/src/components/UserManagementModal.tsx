import React, { useState, useEffect } from "react";
import {
  Users as UsersIcon,
  Plus,
  Shield,
  KeyRound,
  Trash2,
  Edit2,
  AlertTriangle,
  Check,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import type { AuthUser } from "../contexts/AuthContext";

interface UserManagementModalProps {
  isOpen: boolean;
  currentUser: AuthUser | null;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  currentUser,
  onClose,
}) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Inline Editing State (SLS Style)
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [inlineDisplayName, setInlineDisplayName] = useState("");
  const [inlineRole, setInlineRole] = useState<"admin" | "user">("user");
  const [inlineIsActive, setInlineIsActive] = useState(true);

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "user">("user");
  const [formIsActive, setFormIsActive] = useState(true);

  // Reset Password State
  const [resetPwdUserId, setResetPwdUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await fetch("/api/users", { credentials: "include" });
      const data = await res.json();
      if (data.success && data.users) {
        setUsers(data.users);
      } else {
        throw new Error(data.error || "Failed to load users");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setEditingUserId(null);
      setResetPwdUserId(null);
      setNewPassword("");
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenCreate = () => {
    setFormUsername("");
    setFormPassword("");
    setFormDisplayName("");
    setFormRole("user");
    setFormIsActive(true);
    setErrorMessage(null);
    setIsCreateModalOpen(true);
  };

  const handleStartInlineEdit = (user: AuthUser) => {
    setEditingUserId(user.id);
    setInlineDisplayName(user.displayName);
    setInlineRole(user.role);
    setInlineIsActive(user.isActive);
    setResetPwdUserId(null);
  };

  const handleCancelInlineEdit = () => {
    setEditingUserId(null);
  };

  const handleSaveInlineUser = async (userId: number) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          displayName: inlineDisplayName.trim(),
          role: inlineRole,
          isActive: inlineIsActive,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update user");
      setSuccessMessage("User updated successfully!");
      setEditingUserId(null);
      await fetchUsers();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || "Save error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!formUsername.trim() || !formPassword) {
        throw new Error("Username and Password are required");
      }
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: formUsername.trim(),
          password: formPassword,
          displayName: formDisplayName.trim() || formUsername.trim(),
          role: formRole,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create user");
      setSuccessMessage(`User @${data.user.username} (Tenant ID: ${data.user.userNumber}) created!`);
      setIsCreateModalOpen(false);
      await fetchUsers();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || "Save error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (user: AuthUser) => {
    if (!window.confirm(`Are you sure you want to delete user @${user.username} (Tenant ID: ${user.userNumber})? This will permanently remove their access.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete user");
      setSuccessMessage(`User @${user.username} deleted.`);
      await fetchUsers();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || "Delete error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset2FA = async (user: AuthUser) => {
    if (!window.confirm(`Are you sure you want to reset 2FA for @${user.username}?`)) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/reset-2fa`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to reset 2FA");
      setSuccessMessage(`2FA reset successfully for @${user.username}.`);
      await fetchUsers();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || "Reset 2FA error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (userId: number) => {
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Password reset failed");
      setSuccessMessage("Password reset successfully!");
      setResetPwdUserId(null);
      setNewPassword("");
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || "Password reset failed");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Never logged in";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString([], {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
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
          maxWidth: 960,
          background: "var(--bg-secondary, #ffffff)",
          border: "1px solid var(--border-color, #e2e8f0)",
          borderRadius: 20,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          overflow: "hidden",
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border-color, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(124, 58, 237, 0.1)",
                border: "1px solid rgba(124, 58, 237, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#7c3aed",
              }}
            >
              <UsersIcon size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-main, #0f172a)" }}>
                User Management & Folder Isolation
              </h2>
              <p style={{ fontSize: 12, color: "var(--text-muted, #64748b)", margin: "2px 0 0 0" }}>
                Manage user accounts, assigned 5-digit tenant directories, active status, and 2FA credentials
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={handleOpenCreate}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                background: "linear-gradient(135deg, var(--accent, #0284c7), var(--accent-purple, #7c3aed))",
                color: "#ffffff",
                border: "none",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 4px 10px rgba(2, 132, 199, 0.2)",
              }}
            >
              <Plus size={14} /> Add User
            </button>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted, #64748b)",
                cursor: "pointer",
                padding: 6,
                borderRadius: 8,
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Alerts */}
        {(errorMessage || successMessage) && (
          <div style={{ padding: "12px 24px 0 24px" }}>
            {errorMessage && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: 10,
                  color: "#dc2626",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(22, 163, 74, 0.08)",
                  border: "1px solid rgba(22, 163, 74, 0.2)",
                  borderRadius: 10,
                  color: "#16a34a",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Check size={15} style={{ flexShrink: 0 }} />
                <span>{successMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Users Table */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          <div
            style={{
              border: "1px solid var(--border-color, #e2e8f0)",
              borderRadius: 14,
              overflow: "hidden",
              background: "var(--bg-primary, #f8fafc)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
              <thead
                style={{
                  background: "var(--bg-card, #f1f5f9)",
                  borderBottom: "1px solid var(--border-color, #e2e8f0)",
                  color: "var(--text-muted, #64748b)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <tr>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Tenant ID</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>User</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Display Name</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Role</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>2FA Status</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Last Login</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: "1px solid var(--border-color, #e2e8f0)",
                      background: "var(--bg-secondary, #ffffff)",
                    }}
                  >
                    {/* Tenant ID */}
                    <td style={{ padding: "12px 14px" }}>
                      <span
                        style={{
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                          fontWeight: 700,
                          fontSize: 12,
                          color: "#7c3aed",
                          background: "rgba(124, 58, 237, 0.08)",
                          padding: "2px 8px",
                          borderRadius: 6,
                          border: "1px solid rgba(124, 58, 237, 0.2)",
                          display: "inline-block",
                          width: "fit-content",
                        }}
                      >
                        {u.userNumber}
                      </span>
                    </td>

                    {/* Username */}
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--text-main, #0f172a)" }}>
                          @{u.username}
                        </span>
                        {currentUser?.id === u.id && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "1px 5px",
                              borderRadius: 4,
                              background: "var(--accent-glow, rgba(2, 132, 199, 0.15))",
                              color: "var(--accent, #0284c7)",
                            }}
                          >
                            You
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Display Name */}
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: "var(--text-main, #0f172a)" }}>
                      {editingUserId === u.id ? (
                        <input
                          type="text"
                          value={inlineDisplayName}
                          onChange={(e) => setInlineDisplayName(e.target.value)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 6,
                            background: "var(--bg-primary, #f8fafc)",
                            border: "1px solid var(--accent, #0284c7)",
                            fontSize: 12,
                            color: "var(--text-main, #0f172a)",
                            fontWeight: 600,
                            outline: "none",
                            width: "100%",
                            maxWidth: 150,
                            boxSizing: "border-box",
                          }}
                        />
                      ) : (
                        u.displayName
                      )}
                    </td>

                    {/* Role */}
                    <td style={{ padding: "12px 14px" }}>
                      {editingUserId === u.id ? (
                        <select
                          value={inlineRole}
                          onChange={(e) => setInlineRole(e.target.value as "admin" | "user")}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 6,
                            background: "var(--bg-primary, #f8fafc)",
                            border: "1px solid var(--accent, #0284c7)",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--text-main, #0f172a)",
                            outline: "none",
                            cursor: "pointer",
                          }}
                        >
                          <option value="user">USER</option>
                          <option value="admin">ADMIN</option>
                        </select>
                      ) : (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            background: u.role === "admin" ? "rgba(124, 58, 237, 0.1)" : "rgba(2, 132, 199, 0.1)",
                            color: u.role === "admin" ? "#7c3aed" : "#0284c7",
                          }}
                        >
                          {u.role}
                        </span>
                      )}
                    </td>

                    {/* Status (UserCheck / UserX) */}
                    <td style={{ padding: "12px 14px" }}>
                      {editingUserId === u.id ? (
                        <select
                          value={inlineIsActive ? "active" : "disabled"}
                          onChange={(e) => setInlineIsActive(e.target.value === "active")}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 6,
                            background: "var(--bg-primary, #f8fafc)",
                            border: "1px solid var(--accent, #0284c7)",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--text-main, #0f172a)",
                            outline: "none",
                            cursor: "pointer",
                          }}
                        >
                          <option value="active">Active</option>
                          <option value="disabled">Disabled</option>
                        </select>
                      ) : u.isActive ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#16a34a", fontWeight: 600 }}>
                          <UserCheck size={14} /> Active
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#dc2626", fontWeight: 600 }}>
                          <UserX size={14} /> Disabled
                        </span>
                      )}
                    </td>

                    {/* 2FA Status */}
                    <td style={{ padding: "12px 14px" }}>
                      {u.totpEnabled ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            background: "rgba(22, 163, 74, 0.1)",
                            border: "1px solid rgba(22, 163, 74, 0.25)",
                            color: "#16a34a",
                          }}
                        >
                          <Shield size={12} /> 2FA ON
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted, #64748b)" }}>OFF</span>
                      )}
                    </td>

                    {/* Last Login */}
                    <td style={{ padding: "12px 14px", color: "var(--text-muted, #64748b)", fontFamily: "monospace", fontSize: 11 }}>
                      {formatDate(u.lastLoginAt)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      {editingUserId === u.id ? (
                        /* Inline Edit Action Buttons */
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                          <button
                            onClick={() => handleSaveInlineUser(u.id)}
                            disabled={isLoading}
                            title="Save Changes"
                            style={{
                              padding: "4px 10px",
                              borderRadius: 6,
                              background: "var(--accent, #0284c7)",
                              color: "#ffffff",
                              border: "none",
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Check size={12} /> Save
                          </button>
                          <button
                            onClick={handleCancelInlineEdit}
                            disabled={isLoading}
                            title="Cancel Edit"
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              background: "transparent",
                              border: "1px solid var(--border-color, #e2e8f0)",
                              color: "var(--text-muted, #64748b)",
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        /* Standard Action Buttons */
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                          {/* Reset Password Button */}
                          <button
                            onClick={() => {
                              setResetPwdUserId(resetPwdUserId === u.id ? null : u.id);
                              setNewPassword("");
                            }}
                            title="Reset User Password"
                            style={{
                              background: "transparent",
                              border: "1px solid var(--border-color, #e2e8f0)",
                              color: "#d97706",
                              padding: 5,
                              borderRadius: 6,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            <KeyRound size={13} />
                          </button>

                          {/* Reset 2FA */}
                          {u.totpEnabled && (
                            <button
                              onClick={() => handleReset2FA(u)}
                              title="Reset 2FA Credentials"
                              style={{
                                background: "transparent",
                                border: "1px solid rgba(124, 58, 237, 0.3)",
                                color: "#7c3aed",
                                padding: 5,
                                borderRadius: 6,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                            >
                              <Shield size={13} />
                            </button>
                          )}

                          {/* Edit User Button (Direct Inline Modify) */}
                          <button
                            onClick={() => handleStartInlineEdit(u)}
                            title="Directly edit display name, role, and active status inline"
                            style={{
                              background: "transparent",
                              border: "1px solid var(--border-color, #e2e8f0)",
                              color: "var(--accent, #0284c7)",
                              padding: 5,
                              borderRadius: 6,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Delete User Button (Cannot delete self or primary admin) */}
                          {currentUser?.id !== u.id && u.id !== 1 && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              title="Delete User Account"
                              style={{
                                background: "transparent",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                color: "#dc2626",
                                padding: 5,
                                borderRadius: 6,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Inline Password Reset Box */}
                      {resetPwdUserId === u.id && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: 8,
                            borderRadius: 8,
                            background: "rgba(245, 158, 11, 0.08)",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 6,
                          }}
                        >
                          <input
                            type="password"
                            placeholder="New password (min 6)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              background: "var(--bg-secondary, #ffffff)",
                              border: "1px solid var(--border-color, #e2e8f0)",
                              fontSize: 11,
                              outline: "none",
                              width: 140,
                            }}
                          />
                          <button
                            onClick={() => handleResetPassword(u.id)}
                            disabled={isLoading || !newPassword}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 6,
                              background: "#d97706",
                              color: "#ffffff",
                              border: "none",
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setResetPwdUserId(null)}
                            style={{ background: "transparent", border: "none", color: "var(--text-muted, #64748b)", fontSize: 11, cursor: "pointer" }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Bar */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid var(--border-color, #e2e8f0)",
            background: "var(--bg-card, #f1f5f9)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              background: "var(--bg-secondary, #ffffff)",
              border: "1px solid var(--border-color, #e2e8f0)",
              color: "var(--text-main, #0f172a)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Create User Popup Modal (Only for Creating New Accounts) */}
      {isCreateModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              background: "var(--bg-secondary, #ffffff)",
              border: "1px solid var(--border-color, #e2e8f0)",
              borderRadius: 16,
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: "1px solid var(--border-color, #e2e8f0)", paddingBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--text-main, #0f172a)" }}>
                Create New User
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted, #64748b)", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "var(--text-main, #0f172a)" }}>Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. john"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--bg-primary, #f8fafc)",
                    border: "1px solid var(--border-color, #e2e8f0)",
                    color: "var(--text-main, #0f172a)",
                    fontSize: 12,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "var(--text-main, #0f172a)" }}>Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--bg-primary, #f8fafc)",
                    border: "1px solid var(--border-color, #e2e8f0)",
                    color: "var(--text-main, #0f172a)",
                    fontSize: 12,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "var(--text-main, #0f172a)" }}>Initial Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--bg-primary, #f8fafc)",
                    border: "1px solid var(--border-color, #e2e8f0)",
                    color: "var(--text-main, #0f172a)",
                    fontSize: 12,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "var(--text-main, #0f172a)" }}>Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as "admin" | "user")}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: "var(--bg-primary, #f8fafc)",
                      border: "1px solid var(--border-color, #e2e8f0)",
                      color: "var(--text-main, #0f172a)",
                      fontSize: 12,
                      fontWeight: 500,
                      outline: "none",
                      boxSizing: "border-box",
                      cursor: "pointer",
                    }}
                  >
                    <option value="user">User (Isolated Workspace)</option>
                    <option value="admin">Admin (System Access)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "var(--text-main, #0f172a)" }}>Account Status</label>
                  <select
                    value={formIsActive ? "active" : "disabled"}
                    onChange={(e) => setFormIsActive(e.target.value === "active")}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: "var(--bg-primary, #f8fafc)",
                      border: "1px solid var(--border-color, #e2e8f0)",
                      color: "var(--text-main, #0f172a)",
                      fontSize: 12,
                      fontWeight: 500,
                      outline: "none",
                      boxSizing: "border-box",
                      cursor: "pointer",
                    }}
                  >
                    <option value="active">Active (Enabled)</option>
                    <option value="disabled">Disabled (Locked)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid var(--border-color, #e2e8f0)",
                    color: "var(--text-muted, #64748b)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 8,
                    background: "var(--accent, #0284c7)",
                    color: "#ffffff",
                    border: "none",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
