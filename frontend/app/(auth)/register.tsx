import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { useRegister } from "@/hooks/useAuth";

const schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const register = useRegister();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = ({ name, email, password }: FormData) => {
    console.log("Submitting registration:", { name, email }); 

    register.mutate(
      { name, email, password },
      {
        onSuccess: (data) => {
          console.log("Registration successful:", data);
        },
        onError: (err: any) => {
          console.error("Registration error details:", err);
          console.error("Error response:", err?.response);
          console.error("Error message:", err?.message);

          const msg = err?.response?.data?.message ??
            err?.message ??
            "Registration failed. Please try again.";
          Alert.alert("Error", msg);
        },
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-12 pb-8">
            {/* Header */}
            <View className="mb-10">
              <View className="flex-row items-center mb-2">
                <Text className="text-4xl font-black text-primary-600 tracking-tighter">
                  Nutri
                </Text>
                <View className="ml-1 w-2 h-2 rounded-full bg-orange-400 mt-4" />
              </View>
              <Text className="text-2xl font-bold text-gray-900">Create account</Text>
              <Text className="text-sm text-gray-400 mt-1 font-medium">
                Start tracking your nutrition today.
              </Text>
            </View>

            {/* Form */}
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Full name"
                  placeholder="Jane Smith"
                  autoComplete="name"
                  autoCapitalize="words"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.name?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Email"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoComplete="email"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Password"
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.password?.message}
                  hint="At least 8 characters"
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword((v) => !v)} className="pr-2">
                      <MaterialCommunityIcons
                        name={showPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#9ca3af"
                      />
                    </TouchableOpacity>
                  }
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Confirm password"
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            <Button
              label="Create account"
              fullWidth
              variant="secondary"
              isLoading={register.isPending}
              onPress={handleSubmit(onSubmit)}
            />

            {/* Footer */}
            <View className="mt-auto pt-10 items-center">
              <View className="flex-row justify-center mb-4">
                <Text className="text-gray-400 font-medium">Already have an account? </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text className="text-primary-600 font-bold">Log in</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <Text className="text-[10px] text-gray-300 text-center leading-relaxed px-4 uppercase tracking-widest">
                By creating an account you agree to our{"\n"}
                <Text className="font-bold">Terms of Service</Text> and <Text className="font-bold">Privacy Policy</Text>.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
