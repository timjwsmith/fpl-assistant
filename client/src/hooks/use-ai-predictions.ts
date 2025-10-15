import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type {
  FPLPlayer,
  FPLFixture,
  TransferRecommendation,
  CaptainRecommendation,
  Prediction,
  ChipStrategy,
} from "@shared/schema";

export function usePredictPlayerPoints() {
  return useMutation({
    mutationFn: async ({
      player,
      fixtures,
    }: {
      player: FPLPlayer;
      fixtures: FPLFixture[];
    }): Promise<Prediction> => {
      return apiRequest<Prediction>("POST", "/api/ai/predict-player", { player, fixtures });
    },
  });
}

export function useTransferRecommendations() {
  return useMutation({
    mutationFn: async ({
      currentPlayers,
      budget,
    }: {
      currentPlayers: FPLPlayer[];
      budget: number;
    }): Promise<TransferRecommendation[]> => {
      return apiRequest<TransferRecommendation[]>("POST", "/api/ai/transfer-recommendations", {
        currentPlayers,
        budget,
      });
    },
  });
}

export function useCaptainRecommendations() {
  return useMutation({
    mutationFn: async ({
      playerIds,
    }: {
      playerIds: number[];
    }): Promise<CaptainRecommendation[]> => {
      return apiRequest<CaptainRecommendation[]>("POST", "/api/ai/captain-recommendations", { playerIds });
    },
  });
}

export function useChipStrategy() {
  return useMutation({
    mutationFn: async ({
      currentGameweek,
      remainingChips,
    }: {
      currentGameweek: number;
      remainingChips: string[];
    }): Promise<ChipStrategy[]> => {
      return apiRequest<ChipStrategy[]>("POST", "/api/ai/chip-strategy", {
        currentGameweek,
        remainingChips,
      });
    },
  });
}

export function useAnalyzeTeam() {
  return useMutation({
    mutationFn: async ({
      players,
      formation,
      userId = 1,
    }: {
      players: FPLPlayer[];
      formation: string;
      userId?: number;
    }): Promise<{ insights: string[]; predicted_points: number; confidence: number }> => {
      console.log('[MUTATION] Analyzing team... (async polling)', players.length, 'players');
      
      // Step 1: Create prediction request
      const { predictionId } = await apiRequest<{ predictionId: number }>(
        "POST", 
        "/api/ai/analyze-team-async", 
        { players, formation, userId }
      );
      console.log('[MUTATION] Created prediction ID:', predictionId);
      
      // Step 2: Poll for result
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const prediction = await apiRequest<{
          id: number;
          status: string;
          result: { insights: string[]; predicted_points: number; confidence: number } | null;
          error: string | null;
        }>("GET", `/api/ai/prediction/${predictionId}`);
        
        console.log('[MUTATION] Poll attempt', attempts + 1, 'Status:', prediction.status);
        
        if (prediction.status === 'complete' && prediction.result) {
          console.log('[MUTATION] Success!', prediction.result);
          return prediction.result;
        }
        
        if (prediction.status === 'error') {
          throw new Error(prediction.error || 'Prediction failed');
        }
        
        attempts++;
      }
      
      throw new Error('Prediction timeout - please try again');
    },
    onSuccess: (data) => {
      console.log('[MUTATION] Final success!', data);
    },
    onError: (error) => {
      console.error('[MUTATION] Error!', error);
    },
  });
}
