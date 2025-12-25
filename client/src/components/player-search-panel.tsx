import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Filter } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { type FPLPlayer } from "@shared/schema";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PlayerSearchPanelProps {
  players: FPLPlayer[];
  teams: { id: number; name: string; short_name: string; code: number }[];
  positions: { id: number; singular_name: string }[];
  onPlayerSelect: (player: FPLPlayer) => void;
  budgetRemaining: number;
  className?: string;
}

export function PlayerSearchPanel({
  players,
  teams,
  positions,
  onPlayerSelect,
  budgetRemaining,
  className,
}: PlayerSearchPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("points");
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  const filteredPlayers = players
    .filter(player => {
      const matchesSearch = player.web_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          player.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          player.second_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === "all" || player.element_type.toString() === positionFilter;
      const matchesTeam = teamFilter === "all" || player.team.toString() === teamFilter;
      const affordable = showAllPlayers || player.now_cost <= budgetRemaining * 10;
      
      return matchesSearch && matchesPosition && matchesTeam && affordable;
    })
    .sort((a, b) => {
      if (sortBy === "points") return b.total_points - a.total_points;
      if (sortBy === "form") return parseFloat(b.form) - parseFloat(a.form);
      if (sortBy === "price") return b.now_cost - a.now_cost;
      if (sortBy === "ownership") return parseFloat(b.selected_by_percent) - parseFloat(a.selected_by_percent);
      return 0;
    });

  return (
    <Card className={className} data-testid="panel-player-search">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-lg">Search Players</CardTitle>
          <Badge variant="outline" className="font-mono" data-testid="badge-budget">
            £{budgetRemaining.toFixed(1)}m left
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-player-search"
          />
        </div>

        <div className="flex items-center justify-between py-2 px-3 border rounded-md bg-amber-500/10 border-amber-500/30">
          <Label htmlFor="show-all-players" className="text-sm cursor-pointer font-medium">
            Show all players (ignore budget)
          </Label>
          <Switch
            id="show-all-players"
            checked={showAllPlayers}
            onCheckedChange={setShowAllPlayers}
            data-testid="switch-show-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger data-testid="select-position">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              {positions.map(pos => (
                <SelectItem key={pos.id} value={pos.id.toString()}>
                  {pos.singular_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger data-testid="select-team">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id.toString()}>
                  {team.short_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger data-testid="select-sort">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="points">Total Points</SelectItem>
            <SelectItem value="form">Form</SelectItem>
            <SelectItem value="price">Price</SelectItem>
            <SelectItem value="ownership">Ownership</SelectItem>
          </SelectContent>
        </Select>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No players found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              filteredPlayers.slice(0, 50).map(player => {
                const team = teams.find(t => t.id === player.team);
                const position = positions.find(p => p.id === player.element_type);
                
                return (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    teamName={team?.short_name}
                    teamCode={team?.code}
                    positionName={position?.singular_name}
                    onClick={() => onPlayerSelect(player)}
                    showStats={true}
                  />
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
