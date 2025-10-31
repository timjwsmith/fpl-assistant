import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";
import type { FPLGameweek } from "@shared/schema";

interface DeadlineCountdownProps {
  gameweek: FPLGameweek;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function DeadlineCountdown({ gameweek }: DeadlineCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);

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

  useEffect(() => {
    // Initial calculation
    setTimeRemaining(calculateTimeRemaining());

    // Update every second
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [gameweek.deadline_time]);

  if (!timeRemaining) return null;

  const isUrgent = timeRemaining.total > 0 && timeRemaining.total < 24 * 60 * 60 * 1000; // Less than 24 hours
  const isExpired = timeRemaining.total <= 0;

  const getUrgencyColor = () => {
    if (isExpired) return "text-muted-foreground";
    if (isUrgent) return "text-destructive";
    if (timeRemaining.days < 3) return "text-orange-500";
    return "text-primary";
  };

  const getUrgencyBg = () => {
    if (isExpired) return "bg-muted/30 border-muted";
    if (isUrgent) return "bg-destructive/10 border-destructive/30";
    if (timeRemaining.days < 3) return "bg-orange-500/10 border-orange-500/30";
    return "bg-primary/10 border-primary/30";
  };

  return (
    <Card className={`${getUrgencyBg()} border-2`}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {isUrgent && !isExpired ? (
              <AlertTriangle className={`h-6 w-6 ${getUrgencyColor()} mt-1 animate-pulse`} />
            ) : (
              <Clock className={`h-6 w-6 ${getUrgencyColor()} mt-1`} />
            )}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">
                {isExpired ? "Deadline Passed" : "Deadline (Your Time)"}
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
              {timeRemaining.days > 0 && (
                <div className="flex flex-col items-center min-w-[3rem] md:min-w-[4rem]">
                  <span className={`text-2xl md:text-3xl font-bold font-mono ${getUrgencyColor()}`}>
                    {timeRemaining.days}
                  </span>
                  <span className="text-[10px] md:text-xs text-muted-foreground uppercase">
                    {timeRemaining.days === 1 ? 'Day' : 'Days'}
                  </span>
                </div>
              )}
              <div className="flex flex-col items-center min-w-[3rem] md:min-w-[4rem]">
                <span className={`text-2xl md:text-3xl font-bold font-mono ${getUrgencyColor()}`}>
                  {String(timeRemaining.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] md:text-xs text-muted-foreground uppercase">Hrs</span>
              </div>
              <div className="flex flex-col items-center min-w-[3rem] md:min-w-[4rem]">
                <span className={`text-2xl md:text-3xl font-bold font-mono ${getUrgencyColor()}`}>
                  {String(timeRemaining.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] md:text-xs text-muted-foreground uppercase">Mins</span>
              </div>
              <div className="flex flex-col items-center min-w-[3rem] md:min-w-[4rem]">
                <span className={`text-2xl md:text-3xl font-bold font-mono ${getUrgencyColor()}`}>
                  {String(timeRemaining.seconds).padStart(2, '0')}
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

        {isUrgent && !isExpired && (
          <div className="mt-3 pt-3 border-t border-destructive/20">
            <p className="text-xs text-destructive font-medium flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" />
              Urgent: Implement your plan in the FPL app before the deadline!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
