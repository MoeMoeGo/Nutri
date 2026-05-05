import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from "@/constants";

interface EmptyStateProps {
  iconName: keyof typeof MaterialCommunityIcons.glyphMap; 
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ iconName, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <MaterialCommunityIcons 
        name={iconName} 
        size={64} 
        color="#d1d5db" 
        style={{ marginBottom: 16 }} 
      />
      
      <Text className="text-gray-800 font-semibold text-lg text-center">
        {title}
      </Text>
      
      {subtitle && (
        <Text className="text-gray-400 text-sm text-center mt-2 leading-5">
          {subtitle}
        </Text>
      )}
      
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          className="mt-6 bg-primary-600 px-6 py-3 rounded-xl active:bg-primary-700"
        >
          <Text className="text-white font-semibold">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}