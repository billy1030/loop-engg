import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type AlertType = "success" | "error" | "warning" | "info";

export interface ModalAlertProps {
  type?: AlertType;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirm?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose: () => void;
}

export const AlertModal: React.FC<ModalAlertProps> = ({
  type = "info",
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isConfirm = false,
  onConfirm,
  onCancel,
  onClose,
}) => {
  const getTheme = () => {
    switch (type) {
      case "error":
        return {
          icon: <AlertCircle size={22} color="#ef4444" />,
          iconBg: "rgba(239, 68, 68, 0.12)",
          titleColor: "#dc2626",
          bannerBg: "rgba(239, 68, 68, 0.08)",
          bannerBorder: "rgba(239, 68, 68, 0.25)",
          btnColor: "#dc2626",
          defaultTitle: "Operation Failed",
        };
      case "warning":
        return {
          icon: <AlertTriangle size={22} color="#f59e0b" />,
          iconBg: "rgba(245, 158, 11, 0.12)",
          titleColor: "#d97706",
          bannerBg: "rgba(245, 158, 11, 0.08)",
          bannerBorder: "rgba(245, 158, 11, 0.25)",
          btnColor: "#d97706",
          defaultTitle: "Confirmation Required",
        };
      case "success":
        return {
          icon: <CheckCircle2 size={22} color="#10b981" />,
          iconBg: "rgba(16, 185, 129, 0.12)",
          titleColor: "#059669",
          bannerBg: "rgba(16, 185, 129, 0.08)",
          bannerBorder: "rgba(16, 185, 129, 0.25)",
          btnColor: "#059669",
          defaultTitle: "Success",
        };
      default:
        return {
          icon: <Info size={22} color="#3b82f6" />,
          iconBg: "rgba(59, 130, 246, 0.12)",
          titleColor: "#2563eb",
          bannerBg: "rgba(59, 130, 246, 0.08)",
          bannerBorder: "rgba(59, 130, 246, 0.25)",
          btnColor: "#2563eb",
          defaultTitle: "Notification",
        };
    }
  };

  const theme = getTheme();
  const displayTitle = title || theme.defaultTitle;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (isConfirm && onCancel) onCancel();
          else onClose();
        }
      }}
    >
      <div
        style={{
          background: "var(--bg-secondary, #ffffff)",
          border: "1px solid var(--border-color, #e2e8f0)",
          borderRadius: 16,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.1)",
          width: "100%",
          maxWidth: 440,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "modalPop 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px 14px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: theme.iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {theme.icon}
            </div>
            <div>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-main, #0f172a)",
                  margin: 0,
                  lineHeight: 1.25,
                }}
              >
                {displayTitle}
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-muted, #64748b)", margin: "3px 0 0" }}>
                {isConfirm ? "Please review before proceeding" : "System prompt status"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isConfirm && onCancel) onCancel();
              else onClose();
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted, #64748b)",
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Box (SLS Alert Card Style) */}
        <div style={{ padding: "0 20px 18px" }}>
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 12,
              background: theme.bannerBg,
              border: `1px solid ${theme.bannerBorder}`,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: theme.titleColor,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {message}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "12px 20px 16px",
            background: "var(--bg-primary, #f8fafc)",
            borderTop: "1px solid var(--border-color, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          {isConfirm && (
            <button
              onClick={() => {
                if (onCancel) onCancel();
                onClose();
              }}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                background: "transparent",
                border: "1px solid var(--border-color, #cbd5e1)",
                color: "var(--text-main, #334155)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {cancelLabel}
            </button>
          )}

          <button
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              background: theme.btnColor,
              border: "none",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
              transition: "opacity 0.15s ease",
            }}
          >
            {isConfirm ? confirmLabel : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
};
