import React, { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({
  message,
  actionLabel,
  onAction,
  onDismiss,
  duration = 4000,
}: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(duration - 400),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, []);

  const handleAction = () => {
    onAction?.();
    onDismiss();
  };

  return (
    <Animated.View
      style={{ opacity }}
      className="absolute bottom-6 left-4 right-4 z-50"
    >
      <View className="flex-row items-center justify-between bg-gray-900 rounded-2xl px-4 py-3.5">
        <Text className="text-white text-sm flex-1 mr-3" numberOfLines={2}>
          {message}
        </Text>
        {actionLabel && (
          <TouchableOpacity onPress={handleAction}>
            <Text className="text-primary-400 font-semibold text-sm">{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}


type ToastConfig = Omit<ToastProps, "onDismiss">;

let _show: ((config: ToastConfig) => void) | null = null;

export function registerToastHandler(fn: (config: ToastConfig) => void) {
  _show = fn;
}

export function showToast(config: ToastConfig) {
  _show?.(config);
}
