import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PredictionDetail {
  playerId: number;
  playerName: string;
  predictedPoints: number;
  actualPoints: number | null;
  difference: number | null;
  accuracy: number | null;
}

interface PerformanceMetrics {
  totalPredictions: number;
  completedPredictions: number;
  averageError: number | null;
  rmse: number | null;
  mae: number | null;
  accuracyRate: number | null;
}

interface PerformanceData {
  gameweek: number;
  predictions: PredictionDetail[];
  metrics: PerformanceMetrics;
}

export function usePerformanceData(userId: number | null, gameweek: number | null) {
  return useQuery<PerformanceData>({
    queryKey: ["/api/performance", userId, { gameweek }],
    enabled: !!userId && !!gameweek,
    retry: false,
  });
}

export function useUpdateActualPoints() {
  return useMutation({
    mutationFn: async (data: { userId: number; gameweek: number }) => {
      return apiRequest<{ updated: number; errors: string[] }>('POST', '/api/performance/update-actual', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/performance'] });
    },
  });
}
