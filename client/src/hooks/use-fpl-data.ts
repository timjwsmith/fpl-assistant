import { useQuery } from "@tanstack/react-query";

export function useFPLBootstrap() {
  return useQuery({
    queryKey: ["/api/fpl/bootstrap"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useFPLPlayers() {
  return useQuery({
    queryKey: ["/api/fpl/players"],
    staleTime: 5 * 60 * 1000,
  });
}

export function useFPLTeams() {
  return useQuery({
    queryKey: ["/api/fpl/teams"],
    staleTime: 5 * 60 * 1000,
  });
}

export function useFPLGameweeks() {
  return useQuery({
    queryKey: ["/api/fpl/gameweeks"],
    staleTime: 5 * 60 * 1000,
  });
}

export function useFPLFixtures(gameweek?: number) {
  return useQuery({
    queryKey: gameweek ? ["/api/fpl/fixtures", { gameweek }] : ["/api/fpl/fixtures"],
    staleTime: 5 * 60 * 1000,
  });
}

export function useFPLPositions() {
  return useQuery({
    queryKey: ["/api/fpl/positions"],
    staleTime: 60 * 60 * 1000, // 1 hour - positions don't change
  });
}

export function useFPLManager(managerId: number | null) {
  return useQuery({
    queryKey: ["/api/fpl/manager", managerId],
    enabled: !!managerId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFPLManagerPicks(managerId: number | null, gameweek: number | null) {
  return useQuery({
    queryKey: ["/api/fpl/manager", managerId, "picks", gameweek],
    enabled: !!managerId && !!gameweek,
    staleTime: 5 * 60 * 1000,
  });
}
