import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, MEAL_LABELS, QUERY_KEYS } from "@/constants";
import { apiClient } from "@/services/api.client";
import { useAuthStore } from "@/store/auth.store";
import { DailySummary, MealType } from "@/types";
import { Svg, Circle } from 'react-native-svg';

// Calorie ring


interface CalorieRingProps {
  consumed: number;
  goal: number;
}

export function CalorieRing({ consumed, goal }: CalorieRingProps) {
  // SVG Configuration 
  const size = 176; // Matches w-44 (44 * 4)
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // Progress Calculation
  const pct = Math.min(consumed / Math.max(goal, 1), 1);
  const strokeDashoffset = circumference - pct * circumference;
  const over = consumed > goal;

  return (
    <View className="items-center py-6">
      <View className="relative items-center justify-center">
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={COLORS.primaryLight || "#f3f4f6"}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={over ? "#ef4444" : "#16a34a"}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>

        {/* Centered Text Content */}
        <View className="absolute items-center justify-center">
          <Text className="text-4xl font-bold text-gray-900">{consumed}</Text>
          <Text className="text-sm text-gray-500">Cal eaten</Text>
        </View>
      </View>

      {/* Bottom Labels */}
      <View className="mt-4 items-center">
        {over ? (
          <Text className="text-red-500 font-semibold">
            {consumed - goal} cal over goal
          </Text>
        ) : (
          <Text className="text-gray-600">
            <Text className="font-semibold text-primary-600">
              {goal - consumed}
            </Text>{" "}
            cal remaining
          </Text>
        )}
        <Text className="text-xs text-gray-400 mt-1">
          Daily goal: {goal} cal
        </Text>
      </View>
    </View>
  );
}

//  Macro bar 
function MacroBar({
  label,
  current,
  goal,
  color,
  unit = "g",
}: {
  label: string;
  current: number;
  goal: number;
  color: string;
  unit?: string;
}) {
  const pct = Math.min(current / Math.max(goal, 1), 1);
  return (
    <View className="flex-1 mx-1">
      <View className="flex-row justify-between mb-1">
        <Text className="text-xs text-gray-500">{label}</Text>
        <Text className="text-xs font-medium text-gray-700">
          {current}/{goal}{unit}
        </Text>
      </View>
      <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{ width: `${pct * 100}%`, backgroundColor: color }}
        />
      </View>
    </View>
  );
}

// Meal section summary 
const MEAL_CONFIG: Record<MealType, { label: string; icon: string; color: string }> = {
  breakfast: { label: "Breakfast", icon: "weather-sunset-up", color: "#f59e0b" },
  lunch: { label: "Lunch", icon: "weather-sunny", color: "#eab308" },
  dinner: { label: "Dinner", icon: "weather-night", color: "#6366f1" },
  snack: { label: "Snack", icon: "food-apple", color: "#ef4444" },
};

function MealRow({
  mealType,
  calories,
  count,
}: {
  mealType: MealType;
  calories: number;
  count: number;
}) {
  const router = useRouter();
  const config = MEAL_CONFIG[mealType];

  return (
    <TouchableOpacity
      className="flex-row items-center justify-between py-4 border-b border-gray-50"
      onPress={() => router.push("/(tabs)/log")}
    >
      <View className="flex-row items-center gap-4">
        
        <View 
          className="w-10 h-10 rounded-xl items-center justify-center" 
          style={{ backgroundColor: config.color + '15' }}
        >
          <MaterialCommunityIcons 
            name={config.icon as any} 
            size={20} 
            color={config.color} 
          />
        </View>

        <View>
          <Text className="font-bold text-gray-900 text-sm uppercase tracking-wider">
            {config.label}
          </Text>
          <Text className="text-xs text-gray-400 font-medium">
            {count === 0 ? "Nothing logged" : `${count} item${count !== 1 ? "s" : ""}`}
          </Text>
        </View>
      </View>

      <View className="items-end">
        <Text className="font-black text-gray-900 text-base">{calories}</Text>
        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">cal</Text>
      </View>
    </TouchableOpacity>
  );
}
import { addDays, subDays, isToday, format } from "date-fns"; 
import * as Haptics from "expo-haptics";
import { useDateStore } from "@/store/data.store"; 

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter(); 
  

const { selectedDate, dateString, setDate } = useDateStore();


  const handlePrevDay = () => {
    setDate(subDays(selectedDate, 1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleNextDay = () => {
    if (isToday(selectedDate)) return;
    setDate(addDays(selectedDate, 1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const { data: summary, isLoading } = useQuery<DailySummary>({
    queryKey: QUERY_KEYS.dailySummary(dateString),
    queryFn: async () => {
      const { data } = await apiClient.get(`/food/daily-summary?date=${dateString}`);
      return data;
    },
    enabled: !!user,
  });
  const goal = user?.dailyCalorieGoal ?? 2000;
  const consumed = summary?.totalCalories ?? 0;
  const macroGoals = {
    protein: Math.round((goal * 0.3) / 4),
    carbs: Math.round((goal * 0.4) / 4),
    fat: Math.round((goal * 0.3) / 9),
  };

  const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
<View className="bg-white px-6 pt-4 pb-4 border-b border-gray-100">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <Text className="text-2xl font-black text-primary-600 tracking-tighter">
                Nutri
              </Text>
              <View className="ml-1 w-1.5 h-1.5 rounded-full bg-orange-400 mt-2" />
            </View>

            <TouchableOpacity
              className="bg-primary-600 rounded-full px-4 py-2 shadow-sm"
              onPress={() => router.push("/modal/add-food")}
            >
              <Text className="text-white font-bold text-sm">+ Add Food</Text>
            </TouchableOpacity>
          </View>

          {/* Date Navigation Bar */}
          <View className="flex-row items-center justify-between bg-gray-50 rounded-xl px-2 py-2">
            <TouchableOpacity onPress={handlePrevDay} className="p-2">
              <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.primary} />
            </TouchableOpacity>

            <View className="items-center">
              <Text className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE")}
              </Text>
              <Text className="text-sm font-bold text-gray-900">
                {format(selectedDate, "MMM d, yyyy")}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleNextDay}
              disabled={isToday(selectedDate)}
              className={`p-2 ${isToday(selectedDate) ? "opacity-10" : "opacity-100"}`}
            >
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Calorie ring card */}
        <View className="mx-4 mt-4 bg-white rounded-2xl shadow-sm">
          {isLoading ? (
            <View className="h-48 items-center justify-center">
              <Text className="text-gray-400">Loading...</Text>
            </View>
          ) : (
            <CalorieRing consumed={consumed} goal={goal} />
          )}

          {/* Macro bars */}
          <View className="flex-row px-4 pb-6">
            <MacroBar
              label="Protein"
              current={summary?.totalProteinG ?? 0}
              goal={macroGoals.protein}
              color={COLORS.protein}
            />
            <MacroBar
              label="Carbs"
              current={summary?.totalCarbsG ?? 0}
              goal={macroGoals.carbs}
              color={COLORS.carbs}
            />
            <MacroBar
              label="Fat"
              current={summary?.totalFatG ?? 0}
              goal={macroGoals.fat}
              color={COLORS.fat}
            />
          </View>
        </View>

        {/* Meals summary */}
<View className="mx-4 mt-4 bg-white rounded-2xl px-5 mb-8 shadow-sm border border-gray-100">
  <View className="flex-row justify-between items-center pt-5 mb-2">
    <Text className="font-black text-gray-900 uppercase text-xs tracking-[1px]">
      Daily Breakdown
    </Text>
    <MaterialCommunityIcons name="clock-outline" size={16} color="#9ca3af" />
  </View>
  
  {MEAL_TYPES.map((meal) => (
    <MealRow
      key={meal}
      mealType={meal}
      calories={
        summary?.logsByMeal[meal]?.reduce((s, e) => s + e.calories, 0) ?? 0
      }
      count={summary?.logsByMeal[meal]?.length ?? 0}
    />
  ))}
  <TouchableOpacity
    className="py-5 items-center"
    onPress={() => router.push("/modal/add-food")}
  >
    <View className="flex-row items-center gap-2">
      <MaterialCommunityIcons name="plus-circle" size={18} color={COLORS.primary} />
      <Text className="text-primary-600 font-black text-sm uppercase tracking-wide">
        Quick Log
      </Text>
    </View>
  </TouchableOpacity>
</View>
               <View className="mx-4 mt-2 mb-10">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/weight");
            }}
            className="bg-white rounded-2xl px-4 py-4 flex-row items-center justify-between shadow-sm border border-gray-100"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 bg-indigo-50 rounded-full items-center justify-center mr-4">
                <MaterialCommunityIcons name="scale-bathroom" size={26} color="#4f46e5" />
              </View>
              <Text className="font-bold text-gray-900 text-base tracking-tight">Weight Tracking</Text>
            </View>
            <View className="flex-row items-center bg-gray-50 px-3 py-1.5 rounded-lg">
              <Text className="text-gray-600 font-semibold text-sm mr-2">Log</Text>
              <MaterialCommunityIcons name="plus" size={18} color="#4b5563" />
            </View>



          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
