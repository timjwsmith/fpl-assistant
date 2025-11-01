import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { FPLGameweek } from "@shared/schema";

interface DeadlineCountdownProps {
  gameweek: FPLGameweek;
  planId?: number;
  submitted?: boolean;
  submittedAt?: Date | string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function DeadlineCountdown({ gameweek, planId, submitted, submittedAt }: DeadlineCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const markSubmittedMutation = useMutation({
    mutationFn: async () => {
      if (!planId) {
        throw new Error("No plan available to mark as submitted");
      }
      return apiRequest("POST", `/api/automation/plan/${planId}/mark-submitted`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/plan"] });
      toast({
        title: submitted ? "Team Unmarked" : "Team Marked as Submitted",
        description: submitted 
          ? "Your team has been unmarked. You can still make changes." 
          : "Your team has been marked as submitted for this gameweek.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update submission status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const calculateTimeRemaining = (): TimeRemaining => {
    const now = new Date().getTime();
    const deadline = new Date(gameweek.deadline_time).getTime();
    const total = deadline - now;

    if (total <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((total % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, total };
  };

  // Calculate frozen time based on submittedAt timestamp
  const calculateFrozenTime = (): TimeRemaining => {
    if (!submittedAt) return calculateTimeRemaining();
    
    const submittedDate = typeof submittedAt === 'string' ? new Date(submittedAt) : submittedAt;
    const deadline = new Date(gameweek.deadline_time).getTime();
    const total = deadline - submittedDate.getTime();

    if (total <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((total % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, total };
  };

  useEffect(() => {
    const currentTime = calculateTimeRemaining();
    setTimeRemaining(currentTime);

    // Stop countdown if already submitted
    if (submitted) {
      return;
    }

    // Update every second
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [gameweek.deadline_time, submitted]);

  // Use frozen time when submitted, otherwise use live countdown
  const displayTime = submitted && submittedAt ? calculateFrozenTime() : timeRemaining;
  
  if (!displayTime) return null;

  const isUrgent = displayTime.total > 0 && displayTime.total < 24 * 60 * 60 * 1000; // Less than 24 hours
  const isExpired = displayTime.total <= 0;

  const getUrgencyColor = () => {
    if (submitted) return "text-chart-2";
    if (isExpired) return "text-muted-foreground";
    if (isUrgent) return "text-destructive";
    if (displayTime.days < 3) return "text-orange-500";
    return "text-primary";
  };

  const getUrgencyBg = () => {
    if (submitted) return "bg-chart-2/10 border-chart-2/30";
    if (isExpired) return "bg-muted/30 border-muted";
    if (isUrgent) return "bg-destructive/10 border-destructive/30";
    if (displayTime.days < 3) return "bg-orange-500/10 border-orange-500/30";
    return "bg-primary/10 border-primary/30";
  };

  return (
    <Card className={`${getUrgencyBg()} border-2`}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {submitted ? (
              <CheckCircle className={`h-6 w-6 ${getUrgencyColor()} mt-1`} />
            ) : isUrgent && !isExpired ? (
              <AlertTriangle className={`h-6 w-6 ${getUrgencyColor()} mt-1 animate-pulse`} />
            ) : (
              <Clock className={`h-6 w-6 ${getUrgencyColor()} mt-1`} />
            )}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">
                {submitted ? "Team Submitted" : isExpired ? "Deadline Passed" : "Deadline (Your Time)"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {new Date(gameweek.deadline_time).toLocaleString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>
          </div>

          {!isExpired ? (
            <div className="flex gap-1 md:gap-2">
              {displayTime.days > 0 && (
                <div className="flex flex-col items-center min-w-[3rem] md:min-w-[4rem]">
                  <span className={`text-2xl md:text-3xl font-bold font-mono ${getUrgencyColor()}`}>
                    {displayTime.days}
                  </span>
                  <span className="text-[10px] md:text-xs text-muted-foreground uppercase">
                    {displayTime.days === 1 ? 'Day' : 'Days'}
                  </span>
                </div>
              )}
              <div className="flex flex-col items-center min-w-[3rem] md:min-w-[4rem]">
                <span className={`text-2xl md:text-3xl font-bold font-mono ${getUrgencyColor()}`}>
                  {String(displayTime.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] md:text-xs text-muted-foreground uppercase">Hrs</span>
              </div>
              <div className="flex flex-col items-center min-w-[3rem] md:min-w-[4rem]">
                <span className={`text-2xl md:text-3xl font-bold font-mono ${getUrgencyColor()}`}>
                  {String(displayTime.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] md:text-xs text-muted-foreground uppercase">Mins</span>
              </div>
              <div className="flex flex-col items-center min-w-[3rem] md:min-w-[4rem]">
                <span className={`text-2xl md:text-3xl font-bold font-mono ${getUrgencyColor()}`}>
                  {String(displayTime.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] md:text-xs text-muted-foreground uppercase">Secs</span>
              </div>
            </div>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Expired
            </Badge>
          )}
        </div>

        {isUrgent && !isExpired && !submitted && (
          <div className="mt-3 pt-3 border-t border-destructive/20">
            <p className="text-xs text-destructive font-medium flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" />
              Urgent: Implement your plan in the FPL app before the deadline!
            </p>
          </div>
        )}

        {planId && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              onClick={() => markSubmittedMutation.mutate()}
              disabled={markSubmittedMutation.isPending}
              variant={submitted ? "default" : "outline"}
              className={`w-full md:w-auto ${submitted ? "bg-chart-2 hover:bg-chart-2/90 text-white" : "border-fpl-purple text-fpl-purple hover:bg-fpl-purple hover:text-white"}`}
              data-testid="button-mark-submitted"
            >
              {markSubmittedMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : submitted ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  ✓ Team Submitted
                </>
              ) : (
                <>
                  Mark as Submitted
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
