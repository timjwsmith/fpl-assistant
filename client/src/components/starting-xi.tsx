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
}

export function StartingXI({ lineup, allPlayers, allTeams, formation }: StartingXIProps) {
  if (!lineup || lineup.length === 0) {
    return null;
  }

  // Parse formation (e.g., "3-4-3" -> [1, 3, 4, 3])
  const formationParts = formation.split('-').map(Number);
  const rows = [1, ...formationParts]; // Always 1 GK, then DEF-MID-FWD

  // Group players by their row in the formation
  const playersByRow: LineupPlayer[][] = [];
  let currentPosition = 0;

  for (const rowSize of rows) {
    const rowPlayers = lineup.slice(currentPosition, currentPosition + rowSize);
    playersByRow.push(rowPlayers);
    currentPosition += rowSize;
  }

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
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-3 text-center">
          <Badge variant="default" className="mr-2">C</Badge> Captain
          <Badge variant="secondary" className="ml-4 mr-2">V</Badge> Vice-Captain
        </div>
      </CardContent>
    </Card>
  );
}
