import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, isSameDay, parseISO, isAfter, startOfDay } from "date-fns";
import { useSessions } from "@/hooks/use-sessions";
import { Button } from "@/components/ui/button";
import { SessionDialog } from "@/components/SessionDialog";
import { Plus, MapPin, Music } from "lucide-react";
import "react-day-picker/dist/style.css";
import { StyleTag } from "@/lib/style-tags";

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);

  const isFuture = isAfter(startOfDay(selectedDate), startOfDay(new Date()));

  const { data: sessions = [] } = useSessions();

  const selectedSessions = sessions.filter(s =>
    isSameDay(parseISO(s.date as any), selectedDate)
  );

  const sessionDates = sessions.map(s => parseISO(s.date as any));

  const openEdit = (session: any) => {
    setEditingSession(session);
    setIsDialogOpen(true);
  };

  const openNew = () => {
    setEditingSession(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="container px-4 pb-24 pt-8 mx-auto max-w-4xl">
      <h1 className="text-3xl md:text-4x1 font-display font-bold mb-6">Calendar</h1>
      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Calendar Card */}
        <div className="bg-card rounded-2xl p-4 shadow-lg border border-border">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            disabled={{ after: new Date() }}
            modifiers={{ hasSession: sessionDates }}
            modifiersStyles={{
              hasSession: {
                fontWeight: "bold",
                color: "hsl(var(--primary))",
                textDecoration: "underline",
                textDecorationColor: "hsl(var(--primary))",
                textUnderlineOffset: "4px"
              }
            }}
            className="m-0 w-full flex justify-center"
          />
        </div>

        {/* Selected Day Details */}
        <div className="space-y-4">
          <div className="bg-secondary/30 rounded-2xl p-5 border border-border/50">
            <h2 className="text-xl font-bold mb-1 font-display">
              {format(selectedDate, "MMMM do, yyyy")}
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              {selectedSessions.length > 0
                ? `${selectedSessions.length} session${selectedSessions.length > 1 ? "s" : ""} on this day`
                : "No session recorded for this day."}
            </p>

            {selectedSessions.length > 0 ? (
              <div className="space-y-4">
                {selectedSessions.map((session, idx) => (
                  <div key={session.id} className="bg-background rounded-xl p-4 border border-border/50">
                    {selectedSessions.length > 1 && (
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Session {idx + 1}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-foreground/80 mb-3">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-medium">{session.location}</span>
                    </div>

                    <div className="bg-secondary/30 rounded-xl p-3 border border-border/30 mb-3">
                      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                        <Music className="w-3 h-3" />
                        <span>Dances ({session.dances.length})</span>
                      </div>
                      <ul className="space-y-1.5">
                        {session.dances.map((dance) => (
                          <li key={dance.id} className="text-sm font-medium flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                            <span className="flex-1">{(dance as any).songName || dance.danceName}</span>
                            <StyleTag style={(dance as any).style || 'LINE'} styleCustom={(dance as any).styleCustom} />
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      onClick={() => openEdit(session)}
                      className="w-full rounded-xl"
                      variant="outline"
                      data-testid={`button-edit-session-${session.id}`}
                    >
                      Edit Session
                    </Button>
                  </div>
                ))}

                {!isFuture && (
                  <Button
                    onClick={openNew}
                    className="w-full rounded-xl"
                    variant="outline"
                    data-testid="button-add-another-session"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Session
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Nothing here yet</p>
                  <p className="text-sm text-muted-foreground">Log a session to track your moves</p>
                </div>
                <Button
                  onClick={openNew}
                  className="w-full rounded-xl shadow-lg shadow-primary/20"
                  disabled={isFuture}
                  data-testid="button-create-session"
                >
                  {isFuture ? "Future dates unavailable" : "Create Session"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SessionDialog
        date={selectedDate}
        existingSession={editingSession}
        isOpen={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingSession(null);
        }}
      />
    </div>
  );
}
