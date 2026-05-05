import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MealType } from "@/types";
import { MEAL_TYPES, MEAL_LABELS } from "@/constants";

export function MealPicker({
  selected,
  onChange,
}: {
  selected: MealType;
  onChange: (m: MealType) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2 mb-4">
      {MEAL_TYPES.map((meal) => (
        <TouchableOpacity
          key={meal}
          onPress={() => onChange(meal)}
          className={`px-3 py-1.5 rounded-full border ${
            selected === meal
              ? "bg-primary-600 border-primary-600"
              : "bg-white border-gray-200"
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              selected === meal ? "text-white" : "text-gray-600"
            }`}
          >
            {MEAL_LABELS[meal]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}