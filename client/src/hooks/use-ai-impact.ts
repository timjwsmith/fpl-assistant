import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AIImpactSummary {
  totalGameweeksAnalyzed: number;
  totalPointsDelta: number;
  averagePointsDelta: number;
  positiveImpactCount: number;
  negativeImpactCount: number;
  gameweekBreakdown: Array<{
    planId: number;
    gameweek: number;
    pointsDelta: number;
    actualPointsWithAI: number;
    actualPointsWithoutAI: number;
    analysisCompletedAt: string | null;
    status: string;
    transfers: Array<{
      player_out_id: number;
      player_in_id: number;
      expected_points_gain: number;
      reasoning: string;
      priority: 'high' | 'medium' | 'low';
      cost_impact: number;
    }>;
    captainId: number | null;
  }>;
}

interface ImpactAnalysisResult {
  planId: number;
  gameweek: number;
  actualPointsWithAI: number;
  actualPointsWithoutAI: number;
  pointsDelta: number;
  captainComparison: {
    original: { playerId: number; playerName: string; points: number };
    ai: { playerId: number; playerName: string; points: number };
    deltaFromCaptainChange: number;
  };
  transfersImpact?: {
    playersAdded: Array<{ playerId: number; playerName: string; points: number }>;
    playersRemoved: Array<{ playerId: number; playerName: string; points: number }>;
    netTransferImpact: number;
  };
}

export function useAIImpactSummary(userId: number) {
  return useQuery<AIImpactSummary>({
    queryKey: ["/api/ai-impact/summary", userId],
    queryFn: async () => {
      return apiRequest<AIImpactSummary>("GET", `/api/ai-impact/summary/${userId}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAnalyzeAllGameweeks(userId: number) {
  const queryClient = useQueryClient();
  
  return useMutation<ImpactAnalysisResult[], Error>({
    mutationFn: async (): Promise<ImpactAnalysisResult[]> => {
      return apiRequest<ImpactAnalysisResult[]>("POST", `/api/ai-impact/analyze/${userId}`);
    },
    onSuccess: () => {
      // Invalidate the summary query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/ai-impact/summary", userId] });
    },
  });
}
