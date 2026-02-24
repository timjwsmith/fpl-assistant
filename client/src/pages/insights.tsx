import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Users, Target, Award } from "lucide-react";
import { LoadingScreen } from "@/components/loading-screen";
import { ErrorState } from "@/components/error-state";

interface DifferentialPlayer {
  player: {
    id: number;
    web_name: string;
    now_cost: number;
    selected_by_percent: string;
  };
  ownership: number;
  form: number;
  upcomingFixtures: string[];
  score: number;
}

interface TemplatePlayer {
  player: {
    id: number;
    web_name: string;
    now_cost: number;
    selected_by_percent: string;
    points_per_game: string;
  };
  ownership: number;
  eo: number;
  mustHave: boolean;
}

interface CaptaincySwing {
  player: {
    id: number;
    web_name: string;
    team: number;
  };
  expectedPoints: number;
  ownership: number;
  swingPotential: number;
  risk: "low" | "medium" | "high";
}

interface WeeklyInsights {
  differentials: DifferentialPlayer[];
  template: TemplatePlayer[];
  captaincySwings: CaptaincySwing[];
}

export default function InsightsPage() {
  const { data, isLoading, error } = useQuery<WeeklyInsights>({
    queryKey: ["/api/insights/weekly"],
  });

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorState message="Failed to load insights" />;
  if (!data) return <ErrorState message="No insights available" />;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Weekly Insights</h1>
          <p className="text-muted-foreground">Differential picks, template players, and captaincy analysis</p>
        </div>
      </div>

      <Tabs defaultValue="differentials" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="differentials">
            <TrendingUp className="h-4 w-4 mr-2" />
            Differentials
          </TabsTrigger>
          <TabsTrigger value="template">
            <Users className="h-4 w-4 mr-2" />
            Template
          </TabsTrigger>
          <TabsTrigger value="captaincy">
            <Target className="h-4 w-4 mr-2" />
            Captaincy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="differentials">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Differential Picks
                <Badge variant="secondary">{data.differentials.length}</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Low ownership players with strong form and favorable fixtures
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.differentials.map((diff) => (
                <div key={diff.player.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{diff.player.web_name}</h3>
                      <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
                        <span>£{(diff.player.now_cost / 10).toFixed(1)}m</span>
                        <span>Form: {diff.form.toFixed(1)}</span>
                        <span className="text-green-600 font-semibold">{diff.ownership.toFixed(1)}% owned</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Score: {diff.score.toFixed(1)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Upcoming Fixtures:</div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {diff.upcomingFixtures.map((fixture, idx) => (
                        <div key={idx}>{fixture}</div>
                      ))}
                    </div>
                  </div>
                  <Progress value={diff.ownership} className="h-2 mt-3" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="template">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Template Players
                <Badge variant="secondary">{data.template.length}</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Highly owned essential players for competitive teams
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.template.map((temp) => (
                <div key={temp.player.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        {temp.player.web_name}
                        {temp.mustHave && <Award className="h-4 w-4 text-yellow-500" />}
                      </h3>
                      <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
                        <span>£{(temp.player.now_cost / 10).toFixed(1)}m</span>
                        <span>PPG: {parseFloat(temp.player.points_per_game).toFixed(1)}</span>
                        <span className="text-blue-600 font-semibold">{temp.ownership.toFixed(1)}% owned</span>
                      </div>
                    </div>
                    {temp.mustHave && <Badge className="bg-yellow-500">Must Have</Badge>}
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground mb-1">Ownership</div>
                      <Progress value={temp.ownership} className="h-2" />
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">EO:</span>{" "}
                      <span className="font-semibold">{temp.eo.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="captaincy">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                Captaincy Swings
                <Badge variant="secondary">{data.captaincySwings.length}</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                High ceiling captaincy options with rank-changing potential
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.captaincySwings.map((swing) => (
                <div key={swing.player.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{swing.player.web_name}</h3>
                      <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
                        <span>Expected: {swing.expectedPoints.toFixed(1)} pts</span>
                        <span>{swing.ownership.toFixed(1)}% owned</span>
                      </div>
                    </div>
                    <Badge
                      variant={
                        swing.risk === "high"
                          ? "destructive"
                          : swing.risk === "medium"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {swing.risk.toUpperCase()} Risk
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium mb-1">Swing Potential</div>
                      <div className="text-2xl font-bold text-purple-600">
                        +{swing.swingPotential.toFixed(1)} pts
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {swing.risk === "high" && "Differential captain"}
                      {swing.risk === "medium" && "Semi-differential"}
                      {swing.risk === "low" && "Template captain"}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
