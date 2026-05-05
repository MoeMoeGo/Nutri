import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { useCompleteOnboarding } from "@/hooks/useAuth";
import { ActivityLevel, Gender, Goal } from "@/types";
import { calculateDailyCalorieGoal } from "@/utils/nutrition";

//  Step schemas

const step1Schema = z.object({
  name_display: z.string().optional(), 
  age: z.coerce.number().min(13).max(120),
  gender: z.enum(["male", "female", "other"]),
});

const step2Schema = z.object({
  weightKg: z.coerce.number().min(20).max(500),
  heightCm: z.coerce.number().min(50).max(300),
});

const step3Schema = z.object({
  goal: z.enum(["lose", "maintain", "gain"]),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
});

// Option configs

const GENDERS: { value: Gender; label: string; emoji: string }[] = [
  { value: "male", label: "Male", emoji: "♂️" },
  { value: "female", label: "Female", emoji: "♀️" },
  { value: "other", label: "Other", emoji: "⚧️" },
];

const GOALS: { value: Goal; label: string; description: string; emoji: string }[] = [
  { value: "lose", label: "Lose weight", description: "Calorie deficit", emoji: "📉" },
  { value: "maintain", label: "Maintain weight", description: "Balanced intake", emoji: "⚖️" },
  { value: "gain", label: "Gain muscle", description: "Calorie surplus", emoji: "💪" },
];

const ACTIVITY_LEVELS: {
  value: ActivityLevel;
  label: string;
  description: string;
}[] = [
  { value: "sedentary", label: "Sedentary", description: "Little or no exercise" },
  { value: "light", label: "Lightly active", description: "1–3 days/week" },
  { value: "moderate", label: "Moderately active", description: "3–5 days/week" },
  { value: "active", label: "Very active", description: "6–7 days/week" },
  { value: "very_active", label: "Extra active", description: "Physical job or 2× training" },
];
// Chip component

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-4 py-2 rounded-full border mr-2 mb-2 ${
        selected
          ? "bg-primary-600 border-primary-600"
          : "bg-white border-gray-200"
      }`}
    >
      <Text
        className={`text-sm font-medium ${selected ? "text-white" : "text-gray-700"}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

//  Card option 

function OptionCard({
  emoji,
  label,
  description,
  selected,
  onPress,
}: {
  emoji?: string;
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center p-4 rounded-xl border mb-3 ${
        selected
          ? "bg-primary-50 border-primary-500"
          : "bg-white border-gray-200"
      }`}
    >
      {emoji && <Text className="text-2xl mr-3">{emoji}</Text>}
      <View className="flex-1">
        <Text
          className={`font-semibold ${selected ? "text-primary-700" : "text-gray-900"}`}
        >
          {label}
        </Text>
        {description && (
          <Text className="text-sm text-gray-500 mt-0.5">{description}</Text>
        )}
      </View>
      <View
        className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
          selected ? "border-primary-600" : "border-gray-300"
        }`}
      >
        {selected && <View className="w-2.5 h-2.5 rounded-full bg-primary-600" />}
      </View>
    </TouchableOpacity>
  );
}
type Step1Input = z.input<typeof step1Schema>;
type Step1Output = z.output<typeof step1Schema>;

type Step2Input = z.input<typeof step2Schema>;
type Step2Output = z.output<typeof step2Schema>;
// Main screen 

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const completeOnboarding = useCompleteOnboarding();

  // Accumulated form state across steps
  const [step1Data, setStep1Data] = useState<z.infer<typeof step1Schema> | null>(null);
  const [step2Data, setStep2Data] = useState<z.infer<typeof step2Schema> | null>(null);

  //  Step 1 form 
const {
    control: ctrl1,
    handleSubmit: submit1,
    watch: watch1,
    setValue: setValue1,
    formState: { errors: errors1 },
  } = useForm<Step1Input, any, Step1Output>({
    resolver: zodResolver(step1Schema),
    defaultValues: { 
      gender: "male",
      age: "" as any, 
    },
  });
  const selectedGender = watch1("gender"); // This fixes the 'selectedGender' error
  //  Step 2 form 

const {
    control: ctrl2,
    handleSubmit: submit2,
    formState: { errors: errors2 },
  } = useForm<Step2Input, any, Step2Output>({
    resolver: zodResolver(step2Schema),
  });
  //  Step 3 form 
const {
    watch: watch3,
    setValue: setValue3,
    handleSubmit: submit3,
    formState: { errors: errors3 },
  } = useForm<z.infer<typeof step3Schema>>({
    resolver: zodResolver(step3Schema),
    defaultValues: { goal: "maintain", activityLevel: "moderate" },
  });
const selectedGoal = watch3("goal");
  const selectedActivity = watch3("activityLevel");
  // Handlers 

  const onStep1Submit = (data: z.infer<typeof step1Schema>) => {
    setStep1Data(data);
    setStep(2);
  };

  const onStep2Submit = (data: z.infer<typeof step2Schema>) => {
    setStep2Data(data);
    setStep(3);
  };

  const onStep3Submit = (data: z.infer<typeof step3Schema>) => {
    if (!step1Data || !step2Data) return;

    const dailyCalorieGoal = calculateDailyCalorieGoal(
      step2Data.weightKg,
      step2Data.heightCm,
      step1Data.age,
      step1Data.gender,
      data.activityLevel,
      data.goal
    );

    completeOnboarding.mutate(
      {
        age: step1Data.age,
        gender: step1Data.gender,
        weightKg: step2Data.weightKg,
        heightCm: step2Data.heightCm,
        goal: data.goal,
        activityLevel: data.activityLevel,
      },
      {
        onError: () => Alert.alert("Error", "Could not save your profile. Please try again."),
      }
    );
  };

  //  Progress bar 
  const progress = (step / 3) * 100;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Progress */}
      <View className="px-6 pt-4">
        <View className="flex-row items-center mb-1">
          <Text className="text-sm text-gray-500">Step {step} of 3</Text>
        </View>
        <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <View
            className="h-full bg-primary-600 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="px-6"
      >
        {/*Step 1: About you*/}
        {step === 1 && (
          <View className="pt-8 flex-1">
            <Text className="text-2xl font-bold text-gray-900 mb-1">About you</Text>
            <Text className="text-gray-500 mb-6">
              We'll use this to calculate your calorie goal.
            </Text>

            <Text className="text-sm font-medium text-gray-700 mb-3">Gender</Text>
            <View className="flex-row flex-wrap mb-4">
              {GENDERS.map((g) => (
                <Chip
                  key={g.value}
                  label={`${g.emoji} ${g.label}`}
                  selected={selectedGender === g.value}
                  onPress={() => setValue1("gender", g.value)}
                />
              ))}
            </View>

            <Controller
              control={ctrl1}
              name="age"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Age"
                  placeholder="25"
                  keyboardType="number-pad"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value?.toString()}
                  error={errors1.age?.message}
                />
              )}
            />

            <Button
              label="Continue"
              variant="outline"
              fullWidth
              onPress={submit1(onStep1Submit)}
              className="mt-4"
            />
          </View>
        )}

        {/* Step 2: Body measurements */}
        {step === 2 && (
          <View className="pt-8 flex-1">
            <TouchableOpacity onPress={() => setStep(1)} className="mb-4">
              <Text className="text-primary-600">← Back</Text>
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-900 mb-1">Your measurements</Text>
            <Text className="text-gray-500 mb-6">
              Used only for your calorie calculation.
            </Text>

            <Controller
              control={ctrl2}
              name="weightKg"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Current weight (kg)"
                  placeholder="70"
                  keyboardType="decimal-pad"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value?.toString()}
                  error={errors2.weightKg?.message}
                />
              )}
            />

            <Controller
              control={ctrl2}
              name="heightCm"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Height (cm)"
                  placeholder="175"
                  keyboardType="decimal-pad"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value?.toString()}
                  error={errors2.heightCm?.message}
                />
              )}
            />

            <Button
              label="Continue"
              variant="outline"
              fullWidth
              onPress={submit2(onStep2Submit)}
            />
          </View>
        )}

        {/*Step 3: Goal + Activity */}
        {step === 3 && (
          <View className="pt-8 pb-8 flex-1">
            <TouchableOpacity onPress={() => setStep(2)} className="mb-4">
              <Text className="text-primary-600">← Back</Text>
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-900 mb-1">Your goal</Text>
            <Text className="text-gray-500 mb-4">
              We'll set your daily calorie target based on this.
            </Text>

            {GOALS.map((g) => (
              <OptionCard
                key={g.value}
                emoji={g.emoji}
                label={g.label}
                description={g.description}
                selected={selectedGoal === g.value}
                onPress={() => setValue3("goal", g.value)}
              />
            ))}

            <Text className="text-sm font-medium text-gray-700 mt-4 mb-3">
              Activity level
            </Text>

            {ACTIVITY_LEVELS.map((a) => (
              <OptionCard
                key={a.value}
                label={a.label}
                description={a.description}
                selected={selectedActivity === a.value}
                onPress={() => setValue3("activityLevel", a.value)}
              />
            ))}

            <Button
              label="Let's go 🎉"
              fullWidth
              isLoading={completeOnboarding.isPending}
              onPress={submit3(onStep3Submit)}
              variant="outline"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
