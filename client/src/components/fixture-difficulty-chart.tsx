import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Fixture {
  gameweek: number;
  opponent: string;
  isHome: boolean;
  difficulty: number;
}

interface FixtureDifficultyChartProps {
  teamName: string;
  fixtures: Fixture[];
}

const difficultyColors: Record<number, string> = {
  1: "bg-green-500",
  2: "bg-green-400",
  3: "bg-yellow-400",
  4: "bg-orange-400",
  5: "bg-red-500",
};

const difficultyLabels: Record<number, string> = {
  1: "Very Easy",
  2: "Easy",
  3: "Moderate",
  4: "Difficult",
  5: "Very Difficult",
};

export function FixtureDifficultyChart({ teamName, fixtures }: FixtureDifficultyChartProps) {
  const avgDifficulty = fixtures.reduce((sum, f) => sum + f.difficulty, 0) / fixtures.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{teamName} Fixture Run</span>
          <Badge variant="outline">
            Avg Difficulty: {avgDifficulty.toFixed(1)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {fixtures.map((fixture) => (
            <div
              key={fixture.gameweek}
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="w-12 text-center font-semibold text-muted-foreground">
                GW{fixture.gameweek}
              </div>
              <div className="flex-1">
                <div className="font-medium">
                  {fixture.isHome ? "vs" : "@"} {fixture.opponent}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {difficultyLabels[fixture.difficulty]}
                </span>
                <div
                  className={`h-8 w-8 rounded-full ${difficultyColors[fixture.difficulty]} flex items-center justify-center text-white font-bold`}
                >
                  {fixture.difficulty}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
