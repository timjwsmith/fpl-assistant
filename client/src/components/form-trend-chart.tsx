import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface FormTrendChartProps {
  playerName: string;
  formData: Array<{
    gameweek: number;
    points: number;
    opponent: string;
  }>;
}

export function FormTrendChart({ playerName, formData }: FormTrendChartProps) {
  const avgPoints = formData.reduce((sum, gw) => sum + gw.points, 0) / formData.length;
  const recentAvg = formData.slice(-3).reduce((sum, gw) => sum + gw.points, 0) / 3;
  const trend = recentAvg > avgPoints;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{playerName} Form Trend</span>
          <div className="flex items-center gap-2">
            {trend ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm font-normal">
              {recentAvg.toFixed(1)} avg (last 3)
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={formData}>
            <XAxis
              dataKey="gameweek"
              label={{ value: "Gameweek", position: "insideBottom", offset: -5 }}
            />
            <YAxis label={{ value: "Points", angle: -90, position: "insideLeft" }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="font-medium">GW{data.gameweek}</div>
                      <div className="text-sm text-muted-foreground">vs {data.opponent}</div>
                      <div className="font-bold">{data.points} pts</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="points"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
