import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import type { FPLPlayer } from "@shared/schema";

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
  formation: string;
}

export function StartingXI({ lineup, allPlayers, formation }: StartingXIProps) {
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
                      <div className="relative">
                        <div className="bg-primary/10 border border-primary/30 rounded-lg px-2 py-1.5 md:px-3 md:py-2 text-center hover:bg-primary/20 transition-colors">
                          <p className="text-xs md:text-sm font-semibold text-white whitespace-nowrap">
                            {player.web_name}
                          </p>
                          {(lineupPlayer.is_captain || lineupPlayer.is_vice_captain) && (
                            <Badge
                              variant={lineupPlayer.is_captain ? "default" : "secondary"}
                              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs font-bold"
                            >
                              {lineupPlayer.is_captain ? 'C' : 'V'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          <Badge variant="default" className="mr-2">C</Badge> Captain
          <Badge variant="secondary" className="ml-4 mr-2">V</Badge> Vice-Captain
        </p>
      </CardContent>
    </Card>
  );
}
