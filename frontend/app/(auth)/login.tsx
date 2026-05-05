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
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { useLogin, useGoogleLogin, useAppleLogin } from "@/hooks/useAuth";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormData = z.infer<typeof schema>;

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

export default function LoginScreen() {
  const login = useLogin();
  const googleLogin = useGoogleLogin();
  const appleLogin = useAppleLogin();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    login.mutate(data, {
      onError: () => Alert.alert("Login failed", "Invalid email or password."),
    });
  };

  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error("No ID token");
      googleLogin.mutate(idToken, {
        onError: () => Alert.alert("Google sign-in failed", "Please try again."),
      });
    } catch (err) {
      console.warn("Google sign-in error", err);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("Missing Apple identity token");
      }

     
      const formattedFullName = credential.fullName ? {
        givenName: credential.fullName.givenName ?? undefined,
        familyName: credential.fullName.familyName ?? undefined,
      } : undefined;

      appleLogin.mutate({
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode ?? "",
        fullName: formattedFullName,
      });

    } catch (err: any) {
      if (err.code === "ERR_CANCELED") return;
      Alert.alert("Apple Sign-in Error", "Something went wrong.");
    }
  };

  const isBusy = login.isPending || googleLogin.isPending || appleLogin.isPending;

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
          <View className="flex-1 px-6 pt-12 pb-8 justify-between">
            {/* Header */}
            <View className="mb-10">
              <View className="flex-row items-center mb-2">
                <Text className="text-4xl font-black text-primary-600 tracking-tighter">
                  Nutri
                </Text>
                <View className="ml-1 w-2 h-2 rounded-full bg-orange-400 mt-4" />
              </View>
              <Text className="text-2xl font-bold text-gray-900">Welcome back</Text>
              <Text className="text-sm text-gray-400 mt-1 font-medium">
                Log in to continue your health journey.
              </Text>
            </View>

            {/* Form */}
            <View className="gap-y-4">
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Email Address"
                    placeholder="name@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
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
              <TouchableOpacity className="items-end -mt-2">
                <Text className="text-xs font-bold text-primary-600">Forgot Password?</Text>
              </TouchableOpacity>

              <Button
                label="Log in"
                fullWidth
                isLoading={login.isPending}
                onPress={handleSubmit(onSubmit)}
                disabled={isBusy}
              />

              {/* Divider */}
              <View className="flex-row items-center my-10">
                <View className="flex-1 h-[1px] bg-gray-100" />
                <Text className="text-gray-300 text-[10px] font-black uppercase tracking-[2px] mx-4">
                  OR
                </Text>
                <View className="flex-1 h-[1px] bg-gray-100" />
              </View>

              {/* Social */}
              <View className="gap-3">
                <Button
                  label="Continue with Google"
                  variant="outline"
                  fullWidth
                  isLoading={googleLogin.isPending}
                  onPress={handleGoogleSignIn}
                  disabled={isBusy}
                />

                <Button
                  label="Continue with Apple"
                  variant="outline"
                  fullWidth
                  isLoading={appleLogin.isPending}
                  onPress={handleAppleSignIn}
                  disabled={isBusy}
                />

              </View>
            </View>

            {/* Footer */}
            <View className="flex-row justify-center mt-auto pt-10">
              <Text className="text-gray-400 font-medium">New to Nutri? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text className="text-primary-600 font-bold">Create Account</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
