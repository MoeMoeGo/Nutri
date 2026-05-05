import { apiClient } from "./api.client";
import { AuthResponse, User } from "@/types";

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface OnboardingPayload {
  age: number;
  gender: "male" | "female" | "other";
  weightKg: number;
  heightCm: number;
  goal: "lose" | "maintain" | "gain";
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
}

const authService = {
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>("/auth/register", payload);
    return data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>("/auth/login", payload);
    return data;
  },

  loginWithGoogle: async (idToken: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>("/auth/google", { idToken });
    return data;
  },

  loginWithApple: async (payload: {
    identityToken: string;
    authorizationCode: string;
    fullName?: { givenName?: string; familyName?: string } | null;
  }): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>("/auth/apple", payload);
    return data;
  },

  completeOnboarding: async (payload: OnboardingPayload): Promise<User> => {
    const { data } = await apiClient.put<User>("/user/profile", payload);
    return data;
  },

  getProfile: async (): Promise<User> => {
    const { data } = await apiClient.get<User>("/user/profile");
    return data;
  },

  updateProfile: async (payload: Partial<OnboardingPayload & { name: string }>): Promise<User> => {
    const { data } = await apiClient.put<User>("/user/profile", payload);
    return data;
  },
};

export default authService;
