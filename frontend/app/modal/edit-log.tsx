import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { apiClient } from "@/services/api.client";
import { QUERY_KEYS, MEAL_TYPES, MEAL_LABELS, COLORS } from "@/constants";
import { MealType } from "@/types";

export default function EditLogModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const summary = queryClient.getQueryData<any>(QUERY_KEYS.dailySummary(today));
  const allEntries = summary
    ? Object.values(summary.logsByMeal ?? {}).flat() as any[]
    : [];
  const entry = allEntries.find((e: any) => e.id === id);

  const [multiplier, setMultiplier] = useState(
    String(entry?.servingMultiplier ?? 1)
  );
  const [mealType, setMealType] = useState<MealType>(
    (entry?.mealType as MealType) ?? "breakfast"
  );

  const mult = Math.max(parseFloat(multiplier) || 0, 0);
  const base = entry
    ? {
        calories:  Math.round(entry.calories / (entry.servingMultiplier || 1)),
        proteinG:  entry.proteinG / (entry.servingMultiplier || 1),
        carbsG:    entry.carbsG   / (entry.servingMultiplier || 1),
        fatG:      entry.fatG     / (entry.servingMultiplier || 1),
      }
    : { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

  const scaled = {
    calories: Math.round(base.calories * mult),
    protein:  Math.round(base.proteinG * mult * 10) / 10,
    carbs:    Math.round(base.carbsG   * mult * 10) / 10,
    fat:      Math.round(base.fatG     * mult * 10) / 10,
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      apiClient.put(`/food/log/${id}`, { servingMultiplier: mult, mealType }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dailySummary(today) });
      router.back();
    },
    onError: () => Alert.alert("Error", "Could not update entry."),
  });

  if (!entry) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-400">Entry not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" className="px-6 pt-4">
          <Text className="text-lg font-bold text-gray-900 mb-0.5" numberOfLines={2}>
            {entry.foodName}
          </Text>
          {entry.brand && <Text className="text-sm text-gray-400 mb-4">{entry.brand}</Text>}

          {/* Serving size */}
          <Text className="text-sm font-medium text-gray-700 mb-2">Serving size</Text>
          <View className="flex-row items-center gap-3 mb-5">
            <View className="flex-row items-center border border-gray-200 rounded-xl px-3 py-2.5 flex-1">
              <TextInput
                value={multiplier}
                onChangeText={setMultiplier}
                keyboardType="decimal-pad"
                className="flex-1 text-base text-gray-900"
                selectTextOnFocus
              />
            </View>
            <Text className="text-gray-500 text-sm">
              × {entry.servingSize}{entry.servingUnit}
            </Text>
          </View>

          {/* Nutrition preview */}
          <View className="bg-gray-50 rounded-2xl p-4 mb-5">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="font-semibold text-gray-700">Nutrition</Text>
              <Text className="text-2xl font-bold text-gray-900">
                {scaled.calories} <Text className="text-sm font-normal text-gray-400">kcal</Text>
              </Text>
            </View>
            <View className="flex-row justify-between">
              {[
                { label: "Protein", value: scaled.protein, color: COLORS.protein },
                { label: "Carbs",   value: scaled.carbs,   color: COLORS.carbs   },
                { label: "Fat",     value: scaled.fat,     color: COLORS.fat     },
              ].map((m) => (
                <View key={m.label} className="items-center">
                  <Text className="text-xs text-gray-400">{m.label}</Text>
                  <Text className="font-semibold text-sm" style={{ color: m.color }}>{m.value}g</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Meal type */}
          <Text className="text-sm font-medium text-gray-700 mb-2">Meal</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {MEAL_TYPES.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMealType(m)}
                className={`px-4 py-2 rounded-full border ${
                  mealType === m ? "bg-primary-600 border-primary-600" : "bg-white border-gray-200"
                }`}
              >
                <Text className={`text-sm font-medium ${mealType === m ? "text-white" : "text-gray-600"}`}>
                  {MEAL_LABELS[m]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Save */}
          <TouchableOpacity
            onPress={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || mult <= 0}
            className={`rounded-2xl py-4 items-center mb-8 ${mult > 0 ? "bg-primary-600 active:bg-primary-700" : "bg-gray-200"}`}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">Save changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
