import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useProfile, useDeleteData } from "@/hooks/use-profile";
import { useCreateSong } from "@/hooks/use-songs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, Download, Upload, Trash2, FlaskConical, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function DeleteDialog({ title, description, onConfirm, triggerLabel }: {
  title: string; description: string; onConfirm: () => void; triggerLabel: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full rounded-xl border-2 justify-start gap-2 text-destructive hover:text-destructive hover:bg-red-50 border-red-200 hover:border-red-300"
          data-testid={`button-${triggerLabel.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <Trash2 className="w-4 h-4" />
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
          <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function generateCSV(headers: string[], rows: string[][] = []) {
  return [
    headers.join(","),
    ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const rows = lines.slice(1).map(l => l.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
  return { headers, rows };
}

export default function Settings() {
  const { data: profile } = useProfile();
  const deleteData = useDeleteData();
  const createSong = useCreateSong();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; fail: number } | null>(null);

  const seedData = useMutation({
    mutationFn: () => apiRequest("POST", "/api/dev/seed"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      toast({ title: "Test data loaded!", description: "Sample songs and sessions added." });
    },
    onError: () => toast({ title: "Failed to load test data", variant: "destructive" }),
  });

  const handleDelete = async (type: "sessions" | "songs" | "all") => {
    try {
      await deleteData.mutateAsync(type);
      toast({ title: "Deleted successfully." });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const downloadLineDanceTemplate = () => {
    const csv = generateCSV(
      ["Dance Name", "Song Name", "Artist", "Rating (0-5)"],
      [["Tush Push", "Save a Horse (Ride a Cowboy)", "Big & Rich", "4"]]
    );
    downloadCSV("lineup_line_dance_template.csv", csv);
  };

  const downloadSwingTemplate = () => {
    const csv = generateCSV(
      ["Song Name", "Artist", "Style (WCS/ECS/CSW/TWO/OTHER)", "Rating (0-5)"],
      [["All Summer Long", "Kid Rock", "WCS", "4"]]
    );
    downloadCSV("lineup_swing_template.csv", csv);
  };

  const LINE_HEADERS = ["dance name", "song name", "artist", "rating (0-5)"];
  const SWING_HEADERS = ["song name", "artist", "style (wcs/ecs/csw/two/other)", "rating (0-5)"];

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Validate file type
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv") {
      toast({
        title: "Error: Incorrect file type. Please use the template provided.",
        variant: "destructive",
      });
      return;
    }

    const text = await file.text();
    const { headers, rows } = parseCSV(text);

    // Validate exact column headers
    const isLineDance = headers.length === LINE_HEADERS.length && LINE_HEADERS.every((h, i) => headers[i] === h);
    const isSwing     = headers.length === SWING_HEADERS.length && SWING_HEADERS.every((h, i) => headers[i] === h);

    if (!isLineDance && !isSwing) {
      toast({
        title: "Error: Incorrect format. Please use the template provided.",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setImportResult(null);
    let success = 0;
    let fail = 0;

    for (const row of rows) {
      if (row.every(c => !c)) continue;
      try {
        if (isSwing) {
          const songName = row[0] || "";
          const artist = row[1] || "";
          const rawStyle = (row[2] || "WCS").toUpperCase().replace(/[^A-Z]/g, "");
          const rating = Math.min(5, Math.max(0, parseInt(row[3]) || 0));
          if (!songName) { fail++; continue; }
          const validStyles = ["WCS", "ECS", "CSW", "TWO", "OTHER"];
          const style = (validStyles.includes(rawStyle) ? rawStyle : "WCS") as any;
          await createSong.mutateAsync({ danceName: songName, songName, artist, rating, style });
        } else {
          const danceName = row[0] || "";
          const songName = row[1] || "";
          const artist = row[2] || "";
          const rating = Math.min(5, Math.max(0, parseInt(row[3]) || 0));
          if (!danceName || !songName) { fail++; continue; }
          await createSong.mutateAsync({ danceName, songName, artist, rating, style: "LINE" });
        }
        success++;
      } catch {
        fail++;
      }
    }

    setImporting(false);
    setImportResult({ success, fail });
    toast({
      title: `Imported ${success} song${success !== 1 ? "s" : ""}${fail > 0 ? `, ${fail} skipped` : ""}`,
    });
  };

  return (
    <div className="container px-4 pb-24 pt-8 mx-auto max-w-xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-foreground gap-2"
          onClick={() => setLocation("/")}
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Button>
      </div>

      {/* Song Library Templates */}
      <section className="bg-card rounded-2xl p-6 border border-border shadow-sm mb-6">
        <h2 className="text-xl font-bold mb-1 font-display text-foreground">Song Library Templates</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Download a blank template, fill it with your songs, then import it to add them all at once.
        </p>

        <div className="space-y-3 mb-5">
          <Button
            variant="outline"
            className="w-full rounded-xl border-2 justify-start gap-2"
            onClick={downloadLineDanceTemplate}
            data-testid="button-download-line-template"
          >
            <Download className="w-4 h-4" />
            Download Line Dance Template
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-xl border-2 justify-start gap-2"
            onClick={downloadSwingTemplate}
            data-testid="button-download-swing-template"
          >
            <Download className="w-4 h-4" />
            Download Swing Template
          </Button>
        </div>

        <div className="border-t border-border pt-5">
          <h3 className="font-semibold text-sm mb-1">Import Songs from CSV</h3>
          <p className="text-xs text-muted-foreground mb-1">
            Upload a filled template to bulk-add songs. Line vs. Swing is detected from the column headers.
          </p>
          <p className="text-xs text-amber-600 font-medium mb-3">
            Only the provided template should be used to upload songs. Any other sources will not be processed.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImport}
            data-testid="input-import-csv"
          />
          <Button
            variant="outline"
            className="w-full rounded-xl border-2 justify-start gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            data-testid="button-import-csv"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {importing ? "Importing..." : "Import CSV File"}
          </Button>
          {importResult && (
            <div className={`mt-3 flex items-center gap-2 text-sm rounded-xl p-3 border ${importResult.fail === 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
              {importResult.fail === 0
                ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <span>
                {importResult.success} song{importResult.success !== 1 ? "s" : ""} imported
                {importResult.fail > 0 ? `, ${importResult.fail} row${importResult.fail !== 1 ? "s" : ""} skipped` : " successfully"}.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Dev Tools — admin only */}
      {profile?.username === "lineupadmin" && (
        <section className="bg-card rounded-2xl p-6 border border-border shadow-sm mb-6">
          <h2 className="text-xl font-bold mb-1 font-display text-foreground">Developer Tools</h2>
          <p className="text-sm text-muted-foreground mb-4">Load sample data to preview all stat cards.</p>
          <Button
            variant="outline"
            className="w-full rounded-xl border-2 justify-start gap-2"
            onClick={() => seedData.mutate()}
            disabled={seedData.isPending}
            data-testid="button-seed-data"
          >
            {seedData.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
            {seedData.isPending ? "Loading..." : "Load Test Data"}
          </Button>
        </section>
      )}

      {/* Danger Zone */}
      <section className="bg-red-50/50 rounded-2xl p-6 border border-red-100">
        <h2 className="text-xl font-bold mb-2 font-display text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mb-6">Permanently delete your data. This cannot be undone.</p>
        <div className="space-y-3">
          <DeleteDialog
            title="Delete Session Data?"
            description="This will remove all your tracked dance sessions."
            onConfirm={() => handleDelete("sessions")}
            triggerLabel="Delete Session Data"
          />
          <DeleteDialog
            title="Delete Song Library?"
            description="This will empty your song library."
            onConfirm={() => handleDelete("songs")}
            triggerLabel="Delete Song Library"
          />
          <DeleteDialog
            title="Delete ALL Data?"
            description="This will wipe your account data completely. Are you absolutely sure?"
            onConfirm={() => handleDelete("all")}
            triggerLabel="Delete All Data"
          />
        </div>
      </section>
    </div>
  );
}
