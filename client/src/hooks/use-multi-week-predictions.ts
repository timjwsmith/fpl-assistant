import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface MultiWeekPrediction {
  id: number;
  userId: number;
  gameweekPlanId: number;
  startGameweek: number;
  playerOutId: number;
  playerInId: number;
  playerOutName?: string;
  playerInName?: string;
  predictedGain: number;
  timeframeWeeks: number;
  status: 'pending' | 'tracking' | 'completed' | 'voided';
  weeksElapsed: number;
  pointsActualToDate: number;
  actualGainFinal: number | null;
  accuracyPercent: number | null;
  voidReason: string | null;
  closedAt: Date | null;
  createdAt: Date;
  progressPercent?: number;
}

export function useMultiWeekPredictions(userId: number) {
  return useQuery<MultiWeekPrediction[]>({
    queryKey: ["/api/multi-week-predictions", userId],
    queryFn: async () => {
      return apiRequest<MultiWeekPrediction[]>("GET", `/api/multi-week-predictions/${userId}`);
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}
