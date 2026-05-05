import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Alert, Switch,
  Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { useUnitsStore, kgToDisplay, kcalToDisplay, WeightUnit, EnergyUnit } from "@/store/units.store";
import { useLogout, useUpdateNotificationPrefs } from "@/hooks/useAuth";
import { calculateMacroTargets, calculateDailyCalorieGoal } from "@/utils/nutrition";
import { apiClient } from "@/services/api.client";
import { QUERY_KEYS } from "@/constants";
import { User, Goal, ActivityLevel, Gender } from "@/types";

const numField = (min: number, max: number) =>
  z.preprocess(
    (val) => {
      const parsed = parseFloat(String(val));
      return isNaN(parsed) ? undefined : parsed;
    },
    z.number().min(min, `Minimum is ${min}`).max(max, `Maximum is ${max}`)
  ) as unknown as z.ZodNumber;

const editSchema = z.object({
  name: z.string().min(2, "At least 2 characters"),
  age: numField(13, 120),
  gender: z.enum(["male", "female", "other"]),
  weightKg: numField(20, 500),
  heightCm: numField(50, 300),
  goal: z.enum(["lose", "maintain", "gain"]),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
});
type EditFormData = z.infer<typeof editSchema>;

const GOAL_LABELS: Record<string, string> = { lose: "Lose weight", maintain: "Maintain", gain: "Gain muscle" };
const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentary", light: "Lightly active", moderate: "Moderately active",
  active: "Very active", very_active: "Extra active",
};
const GENDER_LABELS: Record<string, string> = { male: "Male", female: "Female", other: "Other" };


function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-3 border-b border-gray-100">
      <Text className="text-gray-500">{label}</Text>
      <Text className="font-medium text-gray-900 ml-4 text-right flex-shrink-0 max-w-[55%]">{value}</Text>
    </View>
  );
}

function SectionCard({ title, children, action }: {
  title: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <View className="bg-white rounded-2xl px-4 mb-4">
      <View className="flex-row items-center justify-between pt-4 pb-2">
        <Text className="font-semibold text-gray-700 text-xs uppercase tracking-wide">{title}</Text>
        {action}
      </View>
      {children}
      <View className="h-1" />
    </View>
  );
}

function NotifRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
      <Text className="text-gray-700">{label}</Text>
      <Switch value={value} onValueChange={onToggle}
        trackColor={{ false: "#e5e7eb", true: "#bbf7d0" }}
        thumbColor={value ? "#16a34a" : "#9ca3af"} />
    </View>
  );
}

function UnitToggle<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row bg-gray-100 rounded-full p-1">
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          onPress={() => onChange(opt.value)}
          className={`px-5 py-1.5 rounded-full ${value === opt.value ? "bg-white" : ""}`}
          style={value === opt.value ? {
            shadowColor: "#000", shadowOpacity: 0.08,
            shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2,
          } : {}}
        >
          <Text className={`text-sm font-semibold ${value === opt.value ? "text-gray-900" : "text-gray-400"}`}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}
      className={`px-3 py-2 rounded-xl border mr-2 mb-2 ${selected ? "bg-primary-600 border-primary-600" : "bg-white border-gray-200"}`}>
      <Text className={`text-sm font-medium ${selected ? "text-white" : "text-gray-700"}`}>{label}</Text>
    </TouchableOpacity>
  );
}

function FInput({ label, error, ...props }: { label: string; error?: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1.5">{label}</Text>
      <TextInput
        className={`border rounded-xl px-3 py-3 text-base text-gray-900 ${error ? "border-red-400" : "border-gray-200"}`}
        placeholderTextColor="#9ca3af" {...props}
      />
      {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
    </View>
  );
}


function EditProfileModal({ visible, onClose, user }: { visible: boolean; onClose: () => void; user: User }) {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<EditFormData>({
  resolver: zodResolver(editSchema),
  defaultValues: {
    name: user.name ?? "",
    age: user.age ?? 25,
    gender: (user.gender ?? "male") as Gender,
    weightKg: user.weightKg ?? 70,
    heightCm: user.heightCm ?? 170,
    goal: (user.goal ?? "maintain") as Goal,
    activityLevel: (user.activityLevel ?? "moderate") as ActivityLevel,
  },
});

  const gender = watch("gender") as Gender;
  const goal = watch("goal") as Goal;
  const activity = watch("activityLevel") as ActivityLevel;

  const mutation = useMutation({
    mutationFn: async (data: EditFormData) => {
      const dailyCalorieGoal = calculateDailyCalorieGoal(
        data.weightKg, data.heightCm, data.age,
        data.gender, data.activityLevel, data.goal,
      );
      const { data: updated } = await apiClient.put<User>("/user/profile", {
        ...data,
        dailyCalorieGoal,
      });
      return updated;
    },
    onSuccess: async (updated) => {
      await setUser(updated);
      queryClient.setQueryData(QUERY_KEYS.profile, updated);
      onClose();
    },
    onError: () => Alert.alert("Error", "Could not save changes. Please try again."),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">

        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-gray-500 text-base">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Edit profile</Text>
          <TouchableOpacity
            onPress={handleSubmit((d) => mutation.mutate(d))}
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? <ActivityIndicator size="small" color="#16a34a" />
              : <Text className="text-primary-600 font-semibold text-base">Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6 pt-5" keyboardShouldPersistTaps="handled">

          {/* Name */}
          <Controller control={control} name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <FInput label="Full name" placeholder="Jane Smith" autoCapitalize="words"
                onChangeText={onChange} onBlur={onBlur} value={value}
                error={errors.name?.message} />
            )} />

          {/* Age */}
          <Controller control={control} name="age"
            render={({ field: { onChange, onBlur, value } }) => (
              <FInput label="Age" placeholder="25" keyboardType="number-pad"
                onChangeText={onChange} onBlur={onBlur} value={String(value ?? "")}
                error={errors.age?.message} />
            )} />

          {/* Gender */}
          <Text className="text-sm font-medium text-gray-700 mb-2">Gender</Text>
          <View className="flex-row flex-wrap mb-4">
            {(["male", "female", "other"] as Gender[]).map((g) => (
              <Chip key={g} label={GENDER_LABELS[g]} selected={gender === g}
                onPress={() => setValue("gender", g)} />
            ))}
          </View>

          {/* Weight + Height */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Controller control={control} name="weightKg"
                render={({ field: { onChange, onBlur, value } }) => (
                  <FInput label="Weight (kg)" placeholder="70" keyboardType="decimal-pad"
                    onChangeText={onChange} onBlur={onBlur} value={String(value ?? "")}
                    error={errors.weightKg?.message} />
                )} />
            </View>
            <View className="flex-1">
              <Controller control={control} name="heightCm"
                render={({ field: { onChange, onBlur, value } }) => (
                  <FInput label="Height (cm)" placeholder="170" keyboardType="decimal-pad"
                    onChangeText={onChange} onBlur={onBlur} value={String(value ?? "")}
                    error={errors.heightCm?.message} />
                )} />
            </View>
          </View>

          {/* Goal */}
          <Text className="text-sm font-medium text-gray-700 mb-2">Goal</Text>
          <View className="flex-row flex-wrap mb-4">
            {(["lose", "maintain", "gain"] as Goal[]).map((g) => (
              <Chip key={g} label={GOAL_LABELS[g]} selected={goal === g}
                onPress={() => setValue("goal", g)} />
            ))}
          </View>

          {/* Activity */}
          <Text className="text-sm font-medium text-gray-700 mb-2">Activity level</Text>
          <View className="flex-row flex-wrap mb-4">
            {(["sedentary", "light", "moderate", "active", "very_active"] as ActivityLevel[]).map((a) => (
              <Chip key={a} label={ACTIVITY_LABELS[a]} selected={activity === a}
                onPress={() => setValue("activityLevel", a)} />
            ))}
          </View>

          <Text className="text-xs text-gray-400 text-center mb-8">
            Your daily calorie goal will be recalculated automatically.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}


export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const updateNotifs = useUpdateNotificationPrefs();
  const [showEdit, setShowEdit] = useState(false);

  const { weight: weightUnit, energy: energyUnit, setWeight, setEnergy } = useUnitsStore();
  const macros = user?.dailyCalorieGoal ? calculateMacroTargets(user.dailyCalorieGoal) : null;

  const togglePref = (pref: "notifyBreakfast" | "notifyLunch" | "notifyDinner" | "notifySummary") =>
    (val: boolean) => { updateNotifs.mutate({ [pref]: val }); };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView>
        <View className="px-6 pt-4 pb-3 bg-white border-b border-gray-100">
          <Text className="text-xl font-bold text-gray-900">Profile</Text>
        </View>

        {/* Avatar */}
        <View className="items-center py-6">
          <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mb-3">
            <Text className="text-3xl font-bold text-primary-700">
              {user?.name?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text className="text-xl font-bold text-gray-900">{user?.name}</Text>
          <Text className="text-gray-400 text-sm">{user?.email}</Text>
        </View>

        <View className="px-4">
          {/* Daily targets */}
          <SectionCard title="Daily targets">
            <Row label="Calorie goal" value={kcalToDisplay(user?.dailyCalorieGoal, energyUnit)} />
            {macros && (
              <>
                <Row label="Protein" value={`${macros.proteinG}g`} />
                <Row label="Carbs" value={`${macros.carbsG}g`} />
                <Row label="Fat" value={`${macros.fatG}g`} />
              </>
            )}
          </SectionCard>

          {/* Personal info */}
          <SectionCard
            title="Personal info"
            action={
              <TouchableOpacity onPress={() => setShowEdit(true)}>
                <Text className="text-primary-600 font-semibold text-sm">Edit</Text>
              </TouchableOpacity>
            }
          >
            <Row label="Age" value={user?.age ? `${user.age} years` : "—"} />
            <Row label="Gender" value={user?.gender ? GENDER_LABELS[user.gender] ?? "—" : "—"} />
            <Row label="Weight" value={kgToDisplay(user?.weightKg, weightUnit)} />
            <Row label="Height" value={user?.heightCm ? `${user.heightCm} cm` : "—"} />
            <Row label="Goal" value={user?.goal ? GOAL_LABELS[user.goal] ?? "—" : "—"} />
            <Row label="Activity" value={user?.activityLevel ? ACTIVITY_LABELS[user.activityLevel] ?? "—" : "—"} />
          </SectionCard>

          {/* Units */}
          <SectionCard title="Units">
            <View className="py-3 border-b border-gray-100">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-gray-700 font-medium">Weight</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">Body weight display</Text>
                </View>
                <UnitToggle<WeightUnit>
                  options={[{ value: "kg", label: "kg" }, { value: "lbs", label: "lbs" }]}
                  value={weightUnit}
                  onChange={setWeight}
                />
              </View>
            </View>
            <View className="py-3">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-gray-700 font-medium">Energy</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">Calorie display</Text>
                </View>
                <UnitToggle<EnergyUnit>
                  options={[{ value: "kcal", label: "kcal" }, { value: "cal", label: "cal" }]}
                  value={energyUnit}
                  onChange={setEnergy}
                />
              </View>
            </View>
          </SectionCard>

          {/* Notifications */}
          <SectionCard title="Notifications">
            <NotifRow label="Breakfast reminder" value={user?.notifyBreakfast ?? true} onToggle={togglePref("notifyBreakfast")} />
            <NotifRow label="Lunch reminder" value={user?.notifyLunch ?? true} onToggle={togglePref("notifyLunch")} />
            <NotifRow label="Dinner reminder" value={user?.notifyDinner ?? true} onToggle={togglePref("notifyDinner")} />
            <NotifRow label="Daily summary" value={user?.notifySummary ?? true} onToggle={togglePref("notifySummary")} />
          </SectionCard>

          {/* Account */}
          <SectionCard title="Account">
            <TouchableOpacity className="py-3"
              onPress={() => Alert.alert("Log out", "Are you sure?", [
                { text: "Cancel", style: "cancel" },
                { text: "Log out", style: "destructive", onPress: logout },
              ])}>
              <Text className="text-red-500 font-medium">Log out</Text>
            </TouchableOpacity>
          </SectionCard>
        </View>

        <View className="h-8" />
      </ScrollView>

      {user && (
        <EditProfileModal visible={showEdit} onClose={() => setShowEdit(false)} user={user} />
      )}
    </SafeAreaView>
  );
}