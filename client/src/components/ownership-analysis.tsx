import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, TrendingUp, AlertTriangle } from "lucide-react";

interface Player {
  id: number;
  name: string;
  ownership: number;
  leagueOwnership: number;
  eo: number;
}

interface OwnershipAnalysisProps {
  players: Player[];
  title?: string;
}

export function OwnershipAnalysis({ players, title = "Ownership Analysis" }: OwnershipAnalysisProps) {
  const differentials = players.filter(p => p.ownership < 10 && p.leagueOwnership > 20);
  const template = players.filter(p => p.ownership > 50);
  const risky = players.filter(p => p.leagueOwnership > 70 && p.ownership < 30);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {differentials.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <h3 className="font-semibold">Differential Picks</h3>
              <Badge variant="secondary">{differentials.length}</Badge>
            </div>
            <div className="space-y-3">
              {differentials.slice(0, 5).map((player) => (
                <div key={player.id} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{player.name}</span>
                    <div className="flex gap-2 text-sm">
                      <span className="text-muted-foreground">Global: {player.ownership}%</span>
                      <span className="text-green-600 font-semibold">League: {player.leagueOwnership}%</span>
                    </div>
                  </div>
                  <Progress value={player.ownership} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {template.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-blue-500" />
              <h3 className="font-semibold">Template Players</h3>
              <Badge variant="secondary">{template.length}</Badge>
            </div>
            <div className="space-y-3">
              {template.slice(0, 5).map((player) => (
                <div key={player.id} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{player.name}</span>
                    <div className="flex gap-2 text-sm">
                      <span className="font-semibold text-blue-600">{player.ownership}%</span>
                      <Badge variant="outline" className="text-xs">
                        EO: {player.eo}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={player.ownership} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {risky.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <h3 className="font-semibold">High League Risk</h3>
              <Badge variant="destructive">{risky.length}</Badge>
            </div>
            <div className="space-y-3">
              {risky.slice(0, 3).map((player) => (
                <div key={player.id} className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{player.name}</span>
                    <div className="text-sm text-orange-700 dark:text-orange-400">
                      {player.leagueOwnership - player.ownership}% gap
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    You don't own this highly owned league player
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
