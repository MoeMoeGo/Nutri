import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SectionList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isToday } from "date-fns";
import * as Haptics from "expo-haptics"; 
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useDateStore } from "@/store/data.store";
import { apiClient } from "@/services/api.client";
import { QUERY_KEYS, MEAL_LABELS, COLORS } from "@/constants";
import { FoodLog, MealType, DailySummary } from "@/types";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_CONFIG: Record<MealType, { label: string; icon: string; color: string }> = {
  breakfast: { label: "Breakfast", icon: "weather-sunset-up", color: "#f59e0b" },
  lunch: { label: "Lunch", icon: "weather-sunny", color: "#eab308" },
  dinner: { label: "Dinner", icon: "weather-night", color: "#6366f1" },
  snack: { label: "Snack", icon: "food-apple", color: "#ef4444" },
};

function FoodLogItem({ item, onDelete }: { item: FoodLog; onDelete: (id: string) => void }) {
  return (
    <View className="flex-row items-center justify-between py-4 px-5 bg-white border-b border-gray-50">
      <View className="flex-1 mr-3">
        <Text className="font-bold text-gray-900 text-base" numberOfLines={1}>
          {item.foodName}
        </Text>
        <Text className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-0.5">
          {item.brand || "Standard Entry"} • {item.servingSize * item.servingMultiplier}{item.servingUnit}
        </Text>
        
        <View className="flex-row gap-2 mt-2">
          <View className="bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
            <Text className="text-[10px] font-bold text-blue-600">P {Math.round(item.proteinG)}g</Text>
          </View>
          <View className="bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
            <Text className="text-[10px] font-bold text-amber-600">C {Math.round(item.carbsG)}g</Text>
          </View>
          <View className="bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
            <Text className="text-[10px] font-bold text-red-600">F {Math.round(item.fatG)}g</Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center gap-4">
        <View className="items-end">
          <Text className="font-black text-gray-900 text-lg leading-tight">{item.calories}</Text>
          <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">cal</Text>
        </View>
        
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Alert.alert("Delete Entry", "Remove this from your log?", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => onDelete(item.id) },
            ]);
          }}
          className="bg-gray-50 p-2 rounded-full"
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function LogScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedDate, dateString } = useDateStore(); 

  const { data: summary, isLoading } = useQuery<DailySummary>({
    queryKey: QUERY_KEYS.dailySummary(dateString),
    queryFn: async () => {
      const { data } = await apiClient.get(`/food/daily-summary?date=${dateString}`);
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/food/log/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dailySummary(dateString) });
    },
  });

  const sections = MEAL_TYPES.map((meal: MealType) => ({
    mealType: meal,
    data: summary?.logsByMeal[meal] ?? [],
    total: (summary?.logsByMeal[meal] ?? []).reduce((acc: number, entry: FoodLog) => acc + entry.calories, 0),
  }));

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-6 pt-2 pb-4 bg-white border-b border-gray-100 flex-row justify-between items-end">
        <View>
          <Text className="text-gray-400 text-[10px] font-black uppercase tracking-[2px]">Journal</Text>
          <Text className="text-2xl font-black text-gray-900">
            {isToday(selectedDate) ? "Today's Logs" : format(selectedDate, "MMM d, yyyy")}
          </Text>
        </View>
        <TouchableOpacity
          className="bg-primary-600 w-10 h-10 rounded-full items-center justify-center shadow-md"
          onPress={() => router.push("/modal/add-food")}
        >
          <MaterialCommunityIcons name="plus" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Loading...</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <View className="flex-row items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
              <View className="flex-row items-center gap-3">
                <View 
                  className="w-8 h-8 rounded-lg items-center justify-center" 
                  style={{ backgroundColor: MEAL_CONFIG[section.mealType].color + '20' }}
                >
                  <MaterialCommunityIcons 
                    name={MEAL_CONFIG[section.mealType].icon as any} 
                    size={18} 
                    color={MEAL_CONFIG[section.mealType].color} 
                  />
                </View>
                <Text className="font-black text-gray-800 text-sm uppercase tracking-wider">
                  {MEAL_CONFIG[section.mealType].label}
                </Text>
              </View>
              <View className="bg-white px-3 py-1 rounded-full border border-gray-200">
                <Text className="text-xs font-bold text-gray-600">{section.total} cal</Text>
              </View>
            </View>
          )}
          renderItem={({ item }) => (
            <FoodLogItem item={item} onDelete={(id) => deleteMutation.mutate(id)} />
          )}
          renderSectionFooter={({ section }) =>
            section.data.length === 0 ? (
              <TouchableOpacity
                className="py-6 items-center bg-white border-b border-gray-50"
                onPress={() => router.push("/modal/add-food")}
              >
                <View className="flex-row items-center gap-2 opacity-40">
                  <MaterialCommunityIcons name="plus-circle-outline" size={16} color="gray" />
                  <Text className="text-gray-500 font-medium text-sm">Add {section.mealType}</Text>
                </View>
              </TouchableOpacity>
            ) : null
          }
          ListFooterComponent={<View className="h-20" />}
        />
      )}
    </SafeAreaView>
  );
}