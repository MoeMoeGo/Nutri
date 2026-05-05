import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { apiClient } from "@/services/api.client";
import { QUERY_KEYS } from "@/constants";
import { WeeklyProgress, MonthlyProgress, WeightEntry } from "@/types";
import { useAuthStore } from "@/store/auth.store";
 
 
export function useWeeklyProgress(startDate?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const start = startDate ?? format(subDays(new Date(), 6), "yyyy-MM-dd");
 
  return useQuery<WeeklyProgress>({
    queryKey: QUERY_KEYS.weeklyProgress(start),
    queryFn: async () => {
      const { data } = await apiClient.get(`/progress/weekly?startDate=${start}`);
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
 
 
export function useMonthlyProgress(year?: number, month?: number) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const now = new Date();
  const y = year  ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;
 
  return useQuery<MonthlyProgress>({
    queryKey: QUERY_KEYS.monthlyProgress(y, m),
    queryFn: async () => {
      const { data } = await apiClient.get(`/progress/monthly?year=${y}&month=${m}`);
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
 
 
export function useWeightHistory() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
 
  const endDate   = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subDays(new Date(), 89), "yyyy-MM-dd");
 
  return useQuery<WeightEntry[]>({
    queryKey: QUERY_KEYS.weightHistory(`${startDate}_${endDate}`),
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/weight?startDate=${startDate}&endDate=${endDate}`
      );
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}
 
 
export function useLogWeight() {
  const queryClient = useQueryClient();
  const now = new Date();
 
  return useMutation({
    mutationFn: (weightKg: number) =>
      apiClient.post<WeightEntry>("/weight", {
        weightKg,
        date: format(now, "yyyy-MM-dd"),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weightHistory"] });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.monthlyProgress(now.getFullYear(), now.getMonth() + 1),
      });
    },
  });
}
 
 
export function useRecentFoods() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
 
  return useQuery({
    queryKey: QUERY_KEYS.recentFoods,
    queryFn: async () => {
      const { data } = await apiClient.get("/food/recent");
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });
}
