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
    }: {
      players: FPLPlayer[];
      formation: string;
    }): Promise<{ insights: string[]; predicted_points: number; confidence: number }> => {
      console.log('[MUTATION] Analyzing team...', players.length, 'players');
      const result = await apiRequest<{ insights: string[]; predicted_points: number; confidence: number }>("POST", "/api/ai/analyze-team", { players, formation });
      console.log('[MUTATION] Got result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('[MUTATION] Success!', data);
    },
    onError: (error) => {
      console.error('[MUTATION] Error!', error);
    },
  });
}
