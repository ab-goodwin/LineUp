import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, isSameDay, parseISO } from "date-fns";
import { useSessions } from "@/hooks/use-sessions";
import { Button } from "@/components/ui/button";
import { SessionDialog } from "@/components/SessionDialog";
import { Plus, MapPin, Music } from "lucide-react";
import { motion } from "framer-motion";
import "react-day-picker/dist/style.css";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: sessions = [], isLoading } = useSessions();

  // Find session for selected date
  const selectedSession = sessions.find(s => 
    isSameDay(parseISO(s.date as any), selectedDate)
  );

  // Dates with sessions for calendar modifiers
  const sessionDates = sessions.map(s => parseISO(s.date as any));

  return (
    <div className="container px-4 pb-24 pt-8 mx-auto max-w-4xl">
      <h1 className="text-3xl font-display font-bold mb-6">Calendar</h1>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Calendar Card */}
        <div className="bg-card rounded-2xl p-4 shadow-lg border border-border">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            modifiers={{
              hasSession: sessionDates,
            }}
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
        <div className="space-y-6">
          <div className="bg-secondary/30 rounded-2xl p-6 border border-border/50">
            <h2 className="text-xl font-bold mb-1 font-display">
              {format(selectedDate, "MMMM do, yyyy")}
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              {selectedSession 
                ? "You danced on this day!" 
                : "No session recorded for this day."}
            </p>

            {selectedSession ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-foreground/80">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium">{selectedSession.location}</span>
                </div>
                
                <div className="bg-background rounded-xl p-4 border border-border/50">
                  <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground uppercase tracking-wide font-semibold">
                    <Music className="w-3 h-3" />
                    <span>Dances ({selectedSession.dances.length})</span>
                  </div>
                  <ul className="space-y-2">
                    {selectedSession.dances.map((dance) => (
                      <li key={dance.id} className="text-sm font-medium flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        {dance.danceName}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  className="w-full rounded-xl mt-4" 
                  variant="outline"
                >
                  Edit Session
                </Button>
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
                  onClick={() => setIsDialogOpen(true)}
                  className="w-full rounded-xl shadow-lg shadow-primary/20"
                >
                  Create Session
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SessionDialog 
        date={selectedDate} 
        existingSession={selectedSession} 
        isOpen={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
