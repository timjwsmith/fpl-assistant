import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { getPlayerShirtUrl } from "@/lib/utils";
import type { FPLPlayer, FPLTeam } from "@shared/schema";

interface LineupPlayer {
  player_id: number;
  position: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  multiplier: number;
}

interface StartingXIProps {
  lineup: LineupPlayer[];
  allPlayers: FPLPlayer[];
  allTeams?: FPLTeam[];
  formation: string;
  predictedPoints?: Map<number, number>; // Map of player_id to predicted points
}

export function StartingXI({ lineup, allPlayers, allTeams, formation, predictedPoints }: StartingXIProps) {
  if (!lineup || lineup.length === 0) {
    return null;
  }

  // Parse formation (e.g., "3-4-3" -> [1, 3, 4, 3])
  const formationParts = formation.split('-').map(Number);
  const rows = [1, ...formationParts]; // Always 1 GK, then DEF-MID-FWD
  const startingXISize = rows.reduce((sum, count) => sum + count, 0); // Total starting XI size (11 players)

  // Group players by their row in the formation (starting XI only)
  const playersByRow: LineupPlayer[][] = [];
  let currentPosition = 0;

  for (const rowSize of rows) {
    const rowPlayers = lineup.slice(currentPosition, currentPosition + rowSize);
    playersByRow.push(rowPlayers);
    currentPosition += rowSize;
  }

  // Extract bench players (positions 12-15)
  const benchPlayers = lineup.slice(startingXISize);

  const getPlayerDetails = (playerId: number) => {
    return allPlayers.find(p => p.id === playerId);
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Starting XI
          <Badge variant="outline" className="ml-auto">
            {formation}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gradient-to-b from-green-900/30 to-green-950/30 rounded-lg p-4 border border-green-800/30">
          <div className="space-y-6">
            {playersByRow.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="flex justify-center gap-2 md:gap-4 flex-wrap"
              >
                {row.map((lineupPlayer) => {
                  const player = getPlayerDetails(lineupPlayer.player_id);
                  if (!player) return null;

                  return (
                    <div
                      key={lineupPlayer.player_id}
                      className="flex flex-col items-center gap-1 min-w-[70px] md:min-w-[90px]"
                    >
                      <div className="relative w-fit">
                        <Avatar className="h-14 w-14 md:h-16 md:w-16 border-2 border-primary/30">
                          <AvatarImage 
                            src={getPlayerShirtUrl(player.team_code, 110)} 
                            alt={`${player.web_name} shirt`}
                          />
                          <AvatarFallback className="text-xs font-semibold">
                            {player.web_name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {lineupPlayer.is_captain && (
                          <div className="absolute -top-1 -right-1 h-6 w-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold z-10 shadow-lg border border-primary-foreground/20">
                            C
                          </div>
                        )}
                        {lineupPlayer.is_vice_captain && (
                          <div className="absolute -top-1 -right-1 h-6 w-6 rounded-md bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold z-10 shadow-lg border border-secondary-foreground/20">
                            V
                          </div>
                        )}
                      </div>
                      <div className="bg-primary/10 border border-primary/30 rounded-lg px-2 py-1 text-center mt-0.5">
                        <p className="text-xs md:text-sm font-semibold text-white whitespace-nowrap">
                          {player.web_name}
                        </p>
                        {predictedPoints && predictedPoints.has(lineupPlayer.player_id) && (
                          <p className="text-[10px] md:text-xs text-fpl-cyan font-bold mt-0.5">
                            {Math.round(predictedPoints.get(lineupPlayer.player_id)! * lineupPlayer.multiplier)} pts
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Bench Section */}
        {benchPlayers.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Bench
            </h3>
            <div className="flex gap-3 flex-wrap">
              {benchPlayers.map((lineupPlayer) => {
                const player = getPlayerDetails(lineupPlayer.player_id);
                if (!player) return null;

                return (
                  <div
                    key={lineupPlayer.player_id}
                    className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-3 py-2 min-w-[140px]"
                  >
                    <Avatar className="h-10 w-10 border border-border/50">
                      <AvatarImage 
                        src={getPlayerShirtUrl(player.team_code, 110)} 
                        alt={`${player.web_name} shirt`}
                      />
                      <AvatarFallback className="text-xs font-semibold">
                        {player.web_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{player.web_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {player.element_type === 1 ? 'GK' : player.element_type === 2 ? 'DEF' : player.element_type === 3 ? 'MID' : 'FWD'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-3 text-center">
          <Badge variant="default" className="mr-2">C</Badge> Captain
          <Badge variant="secondary" className="ml-4 mr-2">V</Badge> Vice-Captain
        </div>
      </CardContent>
    </Card>
  );
}
