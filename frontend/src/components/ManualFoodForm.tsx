import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FoodItem, MealType } from "@/types";
import { MealPicker } from "@/components/MealPicker";

interface ManualFoodFormProps {
  visible: boolean;
  onClose: () => void;
  onLog: (food: Partial<FoodItem>, meal: MealType) => void;
  isLogging: boolean;
}

const SERVING_UNITS = [
  { label: "grams", value: "g", default: true },
  { label: "ounces", value: "oz" },
  { label: "milliliters", value: "ml" },
  { label: "cups", value: "cup" },
  { label: "tablespoons", value: "tbsp" },
  { label: "teaspoons", value: "tsp" },
  { label: "piece", value: "piece" },
  { label: "slice", value: "slice" },
  { label: "serving", value: "serving" },
];

export function ManualFoodForm({
  visible,
  onClose,
  onLog,
  isLogging,
}: ManualFoodFormProps) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [servingSize, setServingSize] = useState("1");
  const [servingUnit, setServingUnit] = useState("g");
  const [selectedMeal, setSelectedMeal] = useState<MealType>("breakfast");

  const [errors, setErrors] = useState<{
    name?: string;
    calories?: string;
    servingSize?: string;
  }>({});

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Food name is required";
    if (!calories.trim()) next.calories = "Calories are required";
    else if (isNaN(parseFloat(calories)) || parseFloat(calories) < 0)
      next.calories = "Enter a valid number";
    
    const size = parseFloat(servingSize);
    if (isNaN(size) || size <= 0)
      next.servingSize = "Enter a valid serving size";
    
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const size = parseFloat(servingSize);
    const caloriesNum = parseFloat(calories) || 0;
    const proteinNum = parseFloat(protein) || 0;
    const carbsNum = parseFloat(carbs) || 0;
    const fatNum = parseFloat(fat) || 0;
    const fiberNum = parseFloat(fiber) || 0;

    onLog(
      {
        name: name.trim(),
        brand: brand.trim() || undefined,
        calories: caloriesNum,
        proteinG: proteinNum,
        carbsG: carbsNum,
        fatG: fatNum,
        fiberG: fiberNum,
        servingSize: size,
        servingUnit: servingUnit,
      },
      selectedMeal,
    );
  };

  const handleClose = () => {
    setName("");
    setBrand("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setFiber("");
    setServingSize("1");
    setServingUnit("g");
    setSelectedMeal("breakfast");
    setErrors({});
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24 }}
          >
            <View className="flex-row justify-between items-center mb-6">
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text className="text-gray-500">Cancel</Text>
              </TouchableOpacity>
              <Text className="font-semibold text-gray-900">Manual entry</Text>
              <View className="w-12" />
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-1.5">
              Food name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              className={`border rounded-xl px-3 py-3 mb-1 text-base text-gray-900 ${
                errors.name ? "border-red-400" : "border-gray-200"
              }`}
              placeholder="e.g. Homemade lasagna"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: undefined })); }}
              autoCapitalize="sentences"
            />
            {errors.name && (
              <Text className="text-red-500 text-xs mb-3">{errors.name}</Text>
            )}

            <Text className="text-sm font-medium text-gray-700 mb-1.5 mt-3">
              Brand <Text className="text-gray-400 text-xs">(optional)</Text>
            </Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-3 py-3 text-base text-gray-900"
              placeholder="e.g. Homemade, Trader Joe's, etc."
              placeholderTextColor="#9ca3af"
              value={brand}
              onChangeText={setBrand}
              autoCapitalize="words"
            />

            <View className="mt-4">
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                Serving size <Text className="text-red-500">*</Text>
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <TextInput
                    className={`border rounded-xl px-3 py-3 text-base text-gray-900 ${
                      errors.servingSize ? "border-red-400" : "border-gray-200"
                    }`}
                    placeholder="1"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                    value={servingSize}
                    onChangeText={(t) => { setServingSize(t); setErrors((e) => ({ ...e, servingSize: undefined })); }}
                  />
                  {errors.servingSize && (
                    <Text className="text-red-500 text-xs mt-1">{errors.servingSize}</Text>
                  )}
                </View>
                <View className="flex-1">
                  <View className="border border-gray-200 rounded-xl px-3 py-2.5">
                    <TextInput
                      value={servingUnit}
                      onChangeText={setServingUnit}
                      placeholder="g"
                      placeholderTextColor="#9ca3af"
                      className="text-base text-gray-900"
                    />
                  </View>
                </View>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
                <View className="flex-row gap-2">
                  {SERVING_UNITS.map((unit) => (
                    <TouchableOpacity
                      key={unit.value}
                      onPress={() => setServingUnit(unit.value)}
                      className={`px-3 py-1.5 rounded-full border ${
                        servingUnit === unit.value
                          ? "bg-primary-600 border-primary-600"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          servingUnit === unit.value ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {unit.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View className="mt-4">
              <Text className="text-sm font-medium text-gray-700 mb-1.5">
                Calories per serving <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className={`border rounded-xl px-3 py-3 text-base text-gray-900 ${
                  errors.calories ? "border-red-400" : "border-gray-200"
                }`}
                placeholder="0"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                value={calories}
                onChangeText={(t) => { setCalories(t); setErrors((e) => ({ ...e, calories: undefined })); }}
              />
              {errors.calories && (
                <Text className="text-red-500 text-xs mt-1">{errors.calories}</Text>
              )}
            </View>

            <View className="mt-4">
              <Text className="text-sm font-medium text-gray-700 mb-3">Macros (per serving)</Text>
              
              <View className="flex-row gap-3 mb-3">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Protein (g)</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-3 py-3 text-base text-gray-900"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                    value={protein}
                    onChangeText={setProtein}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Carbs (g)</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-3 py-3 text-base text-gray-900"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                    value={carbs}
                    onChangeText={setCarbs}
                  />
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Fat (g)</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-3 py-3 text-base text-gray-900"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                    value={fat}
                    onChangeText={setFat}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Fiber (g)</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-3 py-3 text-base text-gray-900"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                    value={fiber}
                    onChangeText={setFiber}
                  />
                </View>
              </View>
            </View>

            <View className="mt-4 mb-3 bg-gray-50 p-3 rounded-xl">
              <Text className="text-xs text-gray-500">
                💡 The values above are for <Text className="font-semibold">one serving</Text>. 
                When you log this food, you'll be able to adjust the serving multiplier.
              </Text>
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-2">Add to meal</Text>
            <MealPicker selected={selectedMeal} onChange={setSelectedMeal} />

            <TouchableOpacity
              onPress={handleSave}
              disabled={isLogging}
              className={`rounded-2xl py-4 items-center mt-6 ${
                isLogging ? "bg-gray-300" : "bg-primary-600"
              }`}
            >
              {isLogging ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">Add to log</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}