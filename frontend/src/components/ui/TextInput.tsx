import React, { forwardRef } from "react";
import {
  TextInput as RNTextInput,
  TextInputProps,
  View,
  Text,
} from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const TextInput = forwardRef<RNTextInput, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, ...rest }, ref) => {
    return (
      <View className="mb-4">
        {label && (
          <Text className="text-sm font-medium text-gray-700 mb-1.5">{label}</Text>
        )}
        <View
          className={`
            flex-row items-center
            bg-white border rounded-xl px-3 py-3
            ${error ? "border-red-500" : "border-gray-200"}
          `}
        >
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <RNTextInput
            ref={ref}
            className="flex-1 text-base text-gray-900"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            {...rest}
          />
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </View>
        {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
        {hint && !error && <Text className="text-gray-400 text-xs mt-1">{hint}</Text>}
      </View>
    );
  }
);

TextInput.displayName = "TextInput";
