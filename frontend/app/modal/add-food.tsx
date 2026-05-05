import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, ScrollView,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { QUERY_KEYS, MEAL_LABELS, COLORS } from "@/constants";
import { FoodItem, MealType } from "@/types";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MealPicker } from "@/components/MealPicker";
import { ManualFoodForm } from "@/components/ManualFoodForm";
import nutritionService from "@/services/nutrition.service";

// Serving detail sheet 
function ServingSheet({
  food, mealType, visible, onClose, onLog, isLogging,
}: {
  food: FoodItem; mealType: MealType; visible: boolean;
  onClose: () => void; onLog: (multiplier: number, meal: MealType) => void; isLogging: boolean;
}) {
  const [multiplier, setMultiplier] = useState("1");
  const [selectedMeal, setSelectedMeal] = useState<MealType>(mealType);

  const mult = Math.max(parseFloat(multiplier) || 0, 0);
  const scaled = {
    calories: Math.round(food.calories * mult),
    protein: Math.round(food.proteinG * mult * 10) / 10,
    carbs: Math.round(food.carbsG * mult * 10) / 10,
    fat: Math.round(food.fatG * mult * 10) / 10,
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
          <ScrollView keyboardShouldPersistTaps="handled">
            <View className="flex-row items-center justify-between px-6 pt-4 pb-3 border-b border-gray-100">
              <TouchableOpacity onPress={onClose}><Text className="text-gray-500">Cancel</Text></TouchableOpacity>
              <Text className="font-semibold text-gray-900">Add to log</Text>
              <View className="w-12" />
            </View>

            <View className="px-6 pt-5">
              <Text className="text-xl font-bold text-gray-900" numberOfLines={2}>{food.name}</Text>
              {food.brand && <Text className="text-sm text-gray-400 mt-0.5">{food.brand}</Text>}

              <View className="mt-5 mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">Serving size</Text>
                <View className="flex-row items-center gap-3">
                  <View className="flex-row items-center border border-gray-200 rounded-xl px-3 py-2.5 flex-1">
                    <TextInput
                      value={multiplier}
                      onChangeText={setMultiplier}
                      keyboardType="decimal-pad"
                      className="text-base text-gray-900 flex-1"
                      selectTextOnFocus
                    />
                  </View>
                  <Text className="text-gray-500 text-sm">× {food.servingSize}{food.servingUnit}</Text>
                </View>
              </View>

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
                    { label: "Carbs", value: scaled.carbs, color: COLORS.carbs },
                    { label: "Fat", value: scaled.fat, color: COLORS.fat },
                  ].map((m) => (
                    <View key={m.label} className="items-center">
                      <Text className="text-xs text-gray-400">{m.label}</Text>
                      <Text className="font-semibold text-sm" style={{ color: m.color }}>{m.value}g</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text className="text-sm font-medium text-gray-700 mb-2">Add to meal</Text>
              <MealPicker selected={selectedMeal} onChange={setSelectedMeal} />

              <TouchableOpacity
                onPress={() => onLog(mult, selectedMeal)}
                disabled={isLogging || mult <= 0}
                className={`rounded-2xl py-4 items-center mt-2 mb-6 ${mult <= 0 ? "bg-gray-200" : "bg-primary-600 active:bg-primary-700"
                  }`}
              >
                {isLogging ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    Add {scaled.calories} kcal to {MEAL_LABELS[selectedMeal]}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

//  Search result row 
function FoodRow({ item, onPress }: { item: FoodItem; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-3.5 border-b border-gray-50 active:bg-gray-50"
    >
      <View className="flex-1 mr-4">
        <Text className="font-medium text-gray-900" numberOfLines={1}>{item.name}</Text>
        {item.brand && <Text className="text-xs text-gray-400 mt-0.5">{item.brand}</Text>}
        <Text className="text-xs text-gray-400 mt-0.5">
          {item.servingSize}{item.servingUnit} · P {item.proteinG}g · C {item.carbsG}g · F {item.fatG}g
        </Text>
      </View>
      <View className="items-end">
        <Text className="font-semibold text-gray-800">{item.calories}</Text>
        <Text className="text-xs text-gray-400">kcal</Text>
      </View>
    </TouchableOpacity>
  );
}

//  Main modal 
export default function AddFoodModal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const [isManualVisible, setIsManualVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [defaultMeal] = useState<MealType>("breakfast");
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(text.trim()), 400);
  }, []);

  const { data: results = [], isFetching } = useQuery<FoodItem[]>({
    queryKey: QUERY_KEYS.foodSearch(debouncedQuery),
    queryFn: () => nutritionService.search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const invalidateAndClose = async () => {
    await queryClient.refetchQueries({ queryKey: QUERY_KEYS.dailySummary(today) });
    router.back();
  };

  //  Search result log 
  const logMutation = useMutation({
    mutationFn: ({ food, multiplier, meal }: { food: FoodItem; multiplier: number; meal: MealType }) =>
      nutritionService.logFood({
        foodName: food.name,
        brand: food.brand ?? undefined,
        calories: food.calories,
        proteinG: food.proteinG,
        carbsG: food.carbsG,
        fatG: food.fatG,
        fiberG: food.fiberG ?? undefined,
        servingSize: food.servingSize,
        servingUnit: food.servingUnit,
        servingMultiplier: multiplier,
        mealType: meal,
        date: today,
        external_food_id: food.external_food_id ?? undefined,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedFood(null);
      invalidateAndClose();
    },
    onError: () => Alert.alert("Error", "Could not save your food log. Please try again."),
  });

 
  const manualLogMutation = useMutation({
    mutationFn: ({ food, meal }: { food: Partial<FoodItem>; meal: MealType }) =>
      nutritionService.logFood({
        foodName: food.name!,
        calories: food.calories ?? 0,
        proteinG: food.proteinG ?? 0,
        carbsG: food.carbsG ?? 0,
        fatG: food.fatG ?? 0,
        servingSize: food.servingSize ?? 1,
        servingUnit: food.servingUnit ?? "serving",
        servingMultiplier: 1,      
        mealType: meal,
        date: today,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsManualVisible(false);
      invalidateAndClose();
    },
    onError: (err) => {
      console.error("[manual log] error:", err);
      Alert.alert("Error", "Failed to save manual entry. Please try again.");
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <View className="px-4 pt-2 pb-3 border-b border-gray-100  ">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2.5">
          <Text className="text-gray-400 mr-2">🔍</Text>
          <TextInput
            placeholder="Search food or brand..."
            placeholderTextColor="#9ca3af"
            className="flex-1 text-base text-gray-900"
            value={searchText}
            onChangeText={handleSearchChange}
            autoFocus
            returnKeyType="search"
          />
          {isFetching && <ActivityIndicator size="small" color={COLORS.primary} />}
          {!!searchText.length && !isFetching && (
            <TouchableOpacity onPress={() => { setSearchText(""); setDebouncedQuery(""); }}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-col mt-2">
          <TouchableOpacity
            className="flex-row items-center gap-2 py-2 mr-5"
            onPress={() => router.push("/modal/barcode")}
          >
            <MaterialCommunityIcons name="barcode-scan" size={18} color={COLORS.primary} />
            <Text className="text-primary-600 text-sm font-medium">Scan barcode</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center gap-2 py-2"
            onPress={() => setIsManualVisible(true)}
          >
            <MaterialCommunityIcons name="pencil-plus" size={18} color={COLORS.primary} />
            <Text className="text-primary-600 text-sm font-medium">Manual entry</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results */}
      {debouncedQuery.length < 2 ? (
        <View className="flex-1 items-center justify-center">
          <MaterialCommunityIcons name="food-apple-outline" size={48} color="#d1d5db" />
          <Text className="text-gray-500 font-medium mt-3">Search for a food</Text>
          <Text className="text-gray-400 text-sm mt-1">Type at least 2 characters</Text>
        </View>
      ) : results.length === 0 && !isFetching ? (
        <View className="flex-1 items-center justify-center">
          <MaterialCommunityIcons name="clipboard-search-outline" size={48} color="#d1d5db" />
          <Text className="text-gray-500 font-medium mt-3">No results found</Text>
          <Text className="text-gray-400 text-sm mt-1">Try a different search term</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FoodRow
              item={item}
              onPress={() => { Haptics.selectionAsync(); setSelectedFood(item); }}
            />
          )}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={<View className="h-20" />}
        />
      )}

      {/* Serving detail sheet */}
      {selectedFood && (
        <ServingSheet
          food={selectedFood}
          mealType={defaultMeal}
          visible={!!selectedFood}
          onClose={() => setSelectedFood(null)}
          onLog={(multiplier, meal) => logMutation.mutate({ food: selectedFood, multiplier, meal })}
          isLogging={logMutation.isPending}
        />
      )}

      {/* Manual entry form */}
      <ManualFoodForm
        visible={isManualVisible}
        onClose={() => setIsManualVisible(false)}
        isLogging={manualLogMutation.isPending}
        onLog={(food, meal) => manualLogMutation.mutate({ food, meal })}
      />
    </SafeAreaView>
  );
}