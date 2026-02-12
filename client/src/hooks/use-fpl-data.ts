import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { FPLPlayer, FPLTeam, FPLGameweek, FPLFixture, FPLManager, FPLTeamPicks } from "@shared/schema";

export function useFPLBootstrap() {
  return useQuery<any>({
    queryKey: ["/api/fpl/bootstrap"],
    queryFn: () => apiRequest("GET", "/api/fpl/bootstrap"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFPLPlayers() {
  return useQuery<FPLPlayer[]>({
    queryKey: ["/api/fpl/players"],
    queryFn: () => apiRequest("GET", "/api/fpl/players"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFPLTeams() {
  return useQuery<FPLTeam[]>({
    queryKey: ["/api/fpl/teams"],
    queryFn: () => apiRequest("GET", "/api/fpl/teams"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFPLGameweeks() {
  return useQuery<FPLGameweek[]>({
    queryKey: ["/api/fpl/gameweeks"],
    queryFn: () => apiRequest("GET", "/api/fpl/gameweeks"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFPLFixtures(gameweek?: number) {
  return useQuery<FPLFixture[]>({
    queryKey: gameweek ? ["/api/fpl/fixtures", { gameweek }] : ["/api/fpl/fixtures"],
    queryFn: () => {
      const url = gameweek ? `/api/fpl/fixtures?gameweek=${gameweek}` : "/api/fpl/fixtures";
      return apiRequest("GET", url);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useFPLPositions() {
  return useQuery<Array<{ id: number; singular_name: string; singular_name_short: string; plural_name: string; plural_name_short: string }>>({
    queryKey: ["/api/fpl/positions"],
    queryFn: () => apiRequest("GET", "/api/fpl/positions"),
    staleTime: 60 * 60 * 1000,
  });
}

export function useFPLManager(managerId: number | null) {
  return useQuery<FPLManager>({
    queryKey: ["/api/fpl/manager", managerId],
    queryFn: () => apiRequest("GET", `/api/fpl/manager/${managerId}`),
    enabled: !!managerId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFPLManagerPicks(managerId: number | null, gameweek: number | null) {
  return useQuery<FPLTeamPicks>({
    queryKey: ["/api/fpl/manager", managerId, "picks", gameweek],
    queryFn: () => apiRequest("GET", `/api/fpl/manager/${managerId}/picks/${gameweek}`),
    enabled: !!managerId && !!gameweek,
    staleTime: 5 * 60 * 1000,
  });
}
