import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  View,
} from "react-native";

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<string, { container: string; text: string }> = {
  primary: {
    container: "bg-primary-600 active:bg-primary-700",
    text: "text-white font-semibold",
  },
  secondary: {
    container: "bg-primary-100 active:bg-primary-200",
    text: "text-primary-800 font-semibold",
  },
  outline: {
    container: "border border-primary-600 bg-transparent active:bg-primary-50",
    text: "text-primary-600 font-semibold",
  },
  ghost: {
    container: "bg-transparent active:bg-gray-100",
    text: "text-gray-700 font-medium",
  },
  danger: {
    container: "bg-red-600 active:bg-red-700",
    text: "text-white font-semibold",
  },
};

const sizeStyles: Record<string, { container: string; text: string }> = {
  sm: { container: "px-3 py-2 rounded-lg", text: "text-sm" },
  md: { container: "px-4 py-3 rounded-xl", text: "text-base" },
  lg: { container: "px-6 py-4 rounded-xl", text: "text-lg" },
};

export function Button({
  label,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  fullWidth = false,
  disabled,
  ...rest
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      className={`
        flex-row items-center justify-center
        ${s.container} ${v.container}
        ${fullWidth ? "w-full" : "self-start"}
        ${isDisabled ? "opacity-50" : ""}
      `}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" || variant === "danger" ? "#fff" : "#16a34a"}
        />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text className={`${v.text} ${s.text}`}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
