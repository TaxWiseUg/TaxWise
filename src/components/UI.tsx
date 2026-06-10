import React, { useState } from "react";
import { C } from "../lib/constants";

interface BadgeProps {
  color: string;
  bg: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ color, bg, children }) => (
  <span
    style={{
      background: bg,
      color,
      fontSize: "0.72rem",
      fontWeight: 700,
      padding: "3px 10px",
      borderRadius: 20,
      display: "inline-block",
    }}
  >
    {children}
  </span>
);

interface ButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  variant?: "primary" | "outline" | "ghost" | "danger" | "gold";
  small?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  variant = "primary",
  small,
  disabled,
  style = {},
}) => {
  const base: React.CSSProperties = {
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    transition: "all .15s",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    ...style,
  };

  const variants = {
    primary: { background: C.teal, color: C.white, padding: small ? "7px 16px" : "10px 22px", fontSize: small ? "0.8rem" : "0.9rem" },
    outline: { background: "transparent", color: C.navy, border: `2px solid ${C.navy}`, padding: small ? "5px 14px" : "8px 20px", fontSize: small ? "0.8rem" : "0.9rem" },
    ghost: { background: "transparent", color: C.muted, padding: small ? "5px 10px" : "8px 14px", fontSize: "0.85rem" },
    danger: { background: C.red, color: C.white, padding: "8px 18px", fontSize: "0.875rem" },
    gold: { background: C.gold, color: C.white, padding: small ? "7px 16px" : "10px 22px", fontSize: small ? "0.8rem" : "0.9rem" },
  };

  return (
    <button style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
};

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style = {}, hover, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        background: C.white,
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        boxShadow: hov ? "0 8px 28px rgba(15,32,68,.1)" : "0 2px 8px rgba(15,32,68,.04)",
        transform: hov ? "translateY(-2px)" : "none",
        transition: "all .2s",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: number;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, width = 560 }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,32,68,.6)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.white,
          borderRadius: 16,
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "18px 24px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 700, color: C.navy, fontSize: "1rem" }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.2rem",
              cursor: "pointer",
              color: C.muted,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
};

interface InputProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}) => (
  <div style={{ marginBottom: 16 }}>
    {label && (
      <label
        style={{
          display: "block",
          fontSize: "0.82rem",
          fontWeight: 600,
          color: C.navy,
          marginBottom: 6,
        }}
      >
        {label}
        {required && <span style={{ color: C.red }}> *</span>}
      </label>
    )}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: "0.875rem",
        fontFamily: "inherit",
        outline: "none",
        background: C.offwhite,
        color: C.text,
        boxSizing: "border-box",
      }}
    />
  </div>
);
