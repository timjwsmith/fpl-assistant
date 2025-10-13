import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type FPLFixture } from "@shared/schema";
import { cn } from "@/lib/utils";

interface FixtureCardProps {
  fixture: FPLFixture;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamShort: string;
  awayTeamShort: string;
  perspective?: 'home' | 'away' | 'neutral';
  className?: string;
}

export function FixtureCard({
  fixture,
  homeTeamName,
  awayTeamName,
  homeTeamShort,
  awayTeamShort,
  perspective = 'neutral',
  className,
}: FixtureCardProps) {
  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return "bg-chart-2/20 text-chart-2 border-chart-2/30";
    if (difficulty === 3) return "bg-chart-4/20 text-chart-4 border-chart-4/30";
    return "bg-destructive/20 text-destructive border-destructive/30";
  };

  const getDifficultyText = (difficulty: number) => {
    if (difficulty <= 2) return "Easy";
    if (difficulty === 3) return "Medium";
    if (difficulty === 4) return "Hard";
    return "Very Hard";
  };

  const relevantDifficulty = perspective === 'home' ? fixture.team_h_difficulty : 
                            perspective === 'away' ? fixture.team_a_difficulty :
                            Math.max(fixture.team_h_difficulty, fixture.team_a_difficulty);

  const kickoffDate = fixture.kickoff_time ? new Date(fixture.kickoff_time) : null;

  return (
    <Card className={cn("p-4 hover-elevate", className)} data-testid={`card-fixture-${fixture.id}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className={cn(
            "text-center min-w-[60px]",
            perspective === 'home' && "font-semibold"
          )}>
            <p className="text-xs text-muted-foreground">Home</p>
            <p className="font-mono font-medium">{homeTeamShort}</p>
            {fixture.finished && fixture.team_h_score !== null && (
              <p className="text-lg font-bold font-mono">{fixture.team_h_score}</p>
            )}
          </div>

          <div className="text-center px-3">
            {fixture.finished ? (
              <Badge variant="outline" className="text-xs">FT</Badge>
            ) : (
              <span className="text-muted-foreground">vs</span>
            )}
          </div>

          <div className={cn(
            "text-center min-w-[60px]",
            perspective === 'away' && "font-semibold"
          )}>
            <p className="text-xs text-muted-foreground">Away</p>
            <p className="font-mono font-medium">{awayTeamShort}</p>
            {fixture.finished && fixture.team_a_score !== null && (
              <p className="text-lg font-bold font-mono">{fixture.team_a_score}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Badge 
            variant="outline" 
            className={cn("text-xs border", getDifficultyColor(relevantDifficulty))}
          >
            {getDifficultyText(relevantDifficulty)}
          </Badge>
          {kickoffDate && !fixture.finished && (
            <p className="text-xs text-muted-foreground">
              {kickoffDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
