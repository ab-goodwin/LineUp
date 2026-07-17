import { useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  FileDown,
  FileUp,
  FlaskConical,
  Loader2,
  MapPin,
  Moon,
  ShieldAlert,
  Sun,
  Trash2,
  Trophy,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { WALKTHROUGH_EVENT } from "@/components/OnboardingCarousel";
import { useProfile, useDeleteData, useUpdateSuggestionsOptIn } from "@/hooks/use-profile";
import { useCreateSong } from "@/hooks/use-songs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTheme } from "@/context/ThemeContext";

type SettingsRowProps = {
  href: string;
  icon: typeof Moon;
  title: string;
  description?: string;
  value?: string;
  destructive?: boolean;
};

function SettingsRow({
  href,
  icon: Icon,
  title,
  description,
  value,
  destructive = false,
}: SettingsRowProps) {
  return (
    <Link href={href} className="block">
      <div
        className="flex min-h-16 cursor-pointer items-center gap-3 border-b border-border/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-secondary/20"
        data-testid={`settings-row-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            destructive
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className={destructive ? "font-semibold text-destructive" : "font-semibold text-foreground"}>
            {title}
          </p>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {value && (
          <span className="shrink-0 text-sm text-muted-foreground">{value}</span>
        )}

        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {children}
      </div>
    </section>
  );
}

function SettingsPageHeader({
  title,
  backHref = "/settings",
  backLabel = "Settings",
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
}) {
  const [, setLocation] = useLocation();

  return (
    <div className="mb-7">
      <Button
        type="button"
        variant="ghost"
        className="-ml-3 mb-2 gap-2 text-muted-foreground hover:text-foreground"
        onClick={() => setLocation(backHref)}
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Button>
      <h1 className="text-3xl font-display font-bold">{title}</h1>
    </div>
  );
}

function SettingsPage({
  title,
  children,
  backHref,
  backLabel,
}: {
  title: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="container mx-auto max-w-xl px-4 pb-28 pt-8">
      <SettingsPageHeader
        title={title}
        backHref={backHref}
        backLabel={backLabel}
      />
      {children}
    </div>
  );
}

function DeleteDialog({
  title,
  description,
  onConfirm,
  triggerLabel,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  triggerLabel: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 rounded-xl border-2 border-red-200 text-destructive hover:border-red-300 hover:bg-red-50 hover:text-destructive dark:border-[#3A3230] dark:hover:bg-[#342B27]"
          data-testid={`button-${triggerLabel.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <Trash2 className="h-4 w-4" />
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
          <AlertDialogAction
            className="rounded-xl bg-destructive hover:bg-destructive/90"
            onClick={onConfirm}
          >
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
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0]
    .split(",")
    .map((header) => header.trim().replace(/^"|"$/g, "").toLowerCase());

  const rows = lines
    .slice(1)
    .map((line) =>
      line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")),
    );

  return { headers, rows };
}

export default function Settings() {
  const { data: profile } = useProfile();
  const { theme } = useTheme();
  const [, setLocation] = useLocation();
  const isAdmin = profile?.username === "lineupadmin";

  return (
    <div className="container mx-auto max-w-xl space-y-6 px-4 pb-28 pt-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <Button
          variant="ghost"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => setLocation("/")}
          data-testid="button-back-home"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Button>
      </div>

      <SettingsSection title="Appearance">
        <SettingsRow
          href="/settings/theme"
          icon={theme === "dark" ? Moon : Sun}
          title="Theme"
          description="Choose light or dark mode"
          value={theme === "dark" ? "Dark" : "Light"}
        />
      </SettingsSection>

      <SettingsSection title="Library">
        <SettingsRow
          href="/settings/templates"
          icon={FileDown}
          title="Song Library Templates"
          description="Download Line Dance and Swing CSV templates for bulk song import"
        />
        <SettingsRow
          href="/settings/import"
          icon={FileUp}
          title="Import Songs"
          description="Upload a completed template"
        />
      </SettingsSection>

      <SettingsSection title="Privacy">
        <SettingsRow
          href="/settings/privacy"
          icon={MapPin}
          title="Location Privacy"
          description="Control Suggested Crew visibility"
          value={(profile?.appearInSuggestions ?? true) ? "On" : "Off"}
        />
      </SettingsSection>

      <SettingsSection title="Walkthrough">
        <SettingsRow
          href="/settings/walkthrough"
          icon={BookOpen}
          title="App Walkthrough"
          description="Replay the LineUp introduction"
        />
      </SettingsSection>

      {isAdmin && (
        <SettingsSection title="Developer">
          <SettingsRow
            href="/settings/developer"
            icon={Wrench}
            title="Developer Tools"
            description="Test data and achievement utilities"
          />
        </SettingsSection>
      )}

      <SettingsSection title="Data">
        <SettingsRow
          href="/settings/danger"
          icon={ShieldAlert}
          title="Danger Zone"
          description="Delete sessions, songs, or all data"
          destructive
        />
      </SettingsSection>
    </div>
  );
}

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingsPage title="Theme">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-5 text-sm text-muted-foreground">
          Choose your preferred LineUp appearance.
        </p>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {theme === "dark" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </div>

            <div>
              <p className="font-semibold">
                {theme === "dark" ? "Dark Mode" : "Light Mode"}
              </p>
              <p className="text-sm text-muted-foreground">
                {theme === "dark"
                  ? "Deep warm charcoal"
                  : "Bright warm western"}
              </p>
            </div>
          </div>

          <Switch
            checked={theme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            data-testid="toggle-dark-mode"
          />
        </div>
      </section>
    </SettingsPage>
  );
}

export function TemplateSettings() {
  const downloadLineDanceTemplate = () => {
    const csv = generateCSV(
      ["Dance Name", "Song Name", "Artist", "Rating (0-5)"],
      [["Tush Push", "Save a Horse (Ride a Cowboy)", "Big & Rich", "4"]],
    );
    downloadCSV("lineup_line_dance_template.csv", csv);
  };

  const downloadSwingTemplate = () => {
    const csv = generateCSV(
      ["Song Name", "Artist", "Style (WCS/ECS/CSW/TWO/OTHER)", "Rating (0-5)"],
      [["All Summer Long", "Kid Rock", "WCS", "4"]],
    );
    downloadCSV("lineup_swing_template.csv", csv);
  };

  return (
    <SettingsPage title="Song Templates">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-5 text-sm text-muted-foreground">
          Download the correct CSV template, fill it out, then upload it from
          Import Songs.
        </p>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 rounded-xl border-2"
            onClick={downloadLineDanceTemplate}
            data-testid="button-download-line-template"
          >
            <Download className="h-4 w-4" />
            Download Line Dance Template
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-2 rounded-xl border-2"
            onClick={downloadSwingTemplate}
            data-testid="button-download-swing-template"
          >
            <Download className="h-4 w-4" />
            Download Swing Template
          </Button>
        </div>
      </section>
    </SettingsPage>
  );
}

export function ImportSettings() {
  const createSong = useCreateSong();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    fail: number;
  } | null>(null);

  const lineHeaders = [
    "dance name",
    "song name",
    "artist",
    "rating (0-5)",
  ];
  const swingHeaders = [
    "song name",
    "artist",
    "style (wcs/ecs/csw/two/other)",
    "rating (0-5)",
  ];

  const handleImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "csv") {
      toast({
        title: "Incorrect file type",
        description: "Please upload one of the provided CSV templates.",
        variant: "destructive",
      });
      return;
    }

    const text = await file.text();
    const { headers, rows } = parseCSV(text);

    const isLineDance =
      headers.length === lineHeaders.length &&
      lineHeaders.every((header, index) => headers[index] === header);

    const isSwing =
      headers.length === swingHeaders.length &&
      swingHeaders.every((header, index) => headers[index] === header);

    if (!isLineDance && !isSwing) {
      toast({
        title: "Incorrect format",
        description: "Please use one of the provided LineUp templates.",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setImportResult(null);

    let success = 0;
    let fail = 0;

    for (const row of rows) {
      if (row.every((cell) => !cell)) continue;

      try {
        if (isSwing) {
          const songName = row[0] || "";
          const artist = row[1] || "";
          const rawStyle = (row[2] || "WCS")
            .toUpperCase()
            .replace(/[^A-Z]/g, "");
          const rating = Math.min(5, Math.max(0, parseInt(row[3]) || 0));

          if (!songName) {
            fail++;
            continue;
          }

          const validStyles = ["WCS", "ECS", "CSW", "TWO", "OTHER"];
          const style = (
            validStyles.includes(rawStyle) ? rawStyle : "WCS"
          ) as any;

          await createSong.mutateAsync({
            danceName: songName,
            songName,
            artist,
            rating,
            style,
          });
        } else {
          const danceName = row[0] || "";
          const songName = row[1] || "";
          const artist = row[2] || "";
          const rating = Math.min(5, Math.max(0, parseInt(row[3]) || 0));

          if (!danceName || !songName) {
            fail++;
            continue;
          }

          await createSong.mutateAsync({
            danceName,
            songName,
            artist,
            rating,
            style: "LINE",
          });
        }

        success++;
      } catch {
        fail++;
      }
    }

    setImporting(false);
    setImportResult({ success, fail });

    toast({
      title: `Imported ${success} song${success !== 1 ? "s" : ""}${
        fail > 0 ? `, ${fail} skipped` : ""
      }`,
    });
  };

  return (
    <SettingsPage title="Import Songs">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-2 text-sm text-muted-foreground">
          Upload a completed Line Dance or Swing template. The format is
          detected from its column headers.
        </p>
        <p className="mb-5 text-sm font-medium text-amber-600">
          Only the provided LineUp templates can be imported.
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
          className="w-full justify-start gap-2 rounded-xl border-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          data-testid="button-import-csv"
        >
          {importing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileUp className="h-4 w-4" />
          )}
          {importing ? "Importing..." : "Choose CSV File"}
        </Button>

        {importResult && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-sm ${
              importResult.fail === 0
                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
                : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
            }`}
          >
            {importResult.fail === 0 ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}

            <span>
              {importResult.success} song
              {importResult.success !== 1 ? "s" : ""} imported
              {importResult.fail > 0
                ? `, ${importResult.fail} row${
                    importResult.fail !== 1 ? "s" : ""
                  } skipped`
                : " successfully"}
              .
            </span>
          </div>
        )}
      </section>
    </SettingsPage>
  );
}

export function PrivacySettings() {
  const { data: profile } = useProfile();
  const updateSuggestionsOptIn = useUpdateSuggestionsOptIn();
  const { toast } = useToast();

  return (
    <SettingsPage title="Location Privacy">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-5 text-sm text-muted-foreground">
          Control whether other dancers can discover you through nearby and
          shared-location suggestions.
        </p>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </div>

            <div>
              <p className="font-semibold">Appear in Suggested Crew</p>
              <p className="text-sm text-muted-foreground">
                Let dancers in your area find you.
              </p>
            </div>
          </div>

          <Switch
            checked={profile?.appearInSuggestions ?? true}
            disabled={updateSuggestionsOptIn.isPending || !profile}
            onCheckedChange={(checked) => {
              updateSuggestionsOptIn.mutate(checked, {
                onSuccess: () =>
                  toast({
                    title: checked
                      ? "You're discoverable"
                      : "You're hidden from suggestions",
                  }),
                onError: () =>
                  toast({
                    title: "Failed to update setting",
                    variant: "destructive",
                  }),
              });
            }}
            data-testid="toggle-appear-in-suggestions"
          />
        </div>
      </section>
    </SettingsPage>
  );
}

export function WalkthroughSettings() {
  return (
    <SettingsPage title="App Walkthrough">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BookOpen className="h-6 w-6" />
        </div>

        <h2 className="mb-2 text-lg font-semibold">Replay the Introduction</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Revisit the LineUp walkthrough for a refresher on the Recap, Calendar,
          Library, Crew, and Buckles pages.
        </p>

        <Button
          variant="outline"
          className="w-full justify-start gap-2 rounded-xl border-2"
          onClick={() =>
            window.dispatchEvent(new CustomEvent(WALKTHROUGH_EVENT))
          }
          data-testid="button-view-walkthrough"
        >
          <BookOpen className="h-4 w-4" />
          View App Walkthrough
        </Button>
      </section>
    </SettingsPage>
  );
}

export function DeveloperSettings() {
  const { data: profile } = useProfile();
  const { toast } = useToast();

  const grantAllAchievements = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/dev/grant-all-achievements"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/achievements/unseen"],
      });
      toast({
        title: "All badges rewarded!",
        description: "Every achievement has been unlocked.",
      });
    },
    onError: () =>
      toast({
        title: "Failed to reward badges",
        variant: "destructive",
      }),
  });

  const seedData = useMutation({
    mutationFn: () => apiRequest("POST", "/api/dev/seed"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      toast({
        title: "Test data loaded!",
        description: "Sample songs and sessions added.",
      });
    },
    onError: () =>
      toast({
        title: "Failed to load test data",
        variant: "destructive",
      }),
  });

  if (profile && profile.username !== "lineupadmin") {
    return (
      <SettingsPage title="Developer Tools">
        <section className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
          <Wrench className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Developer access required</p>
          <p className="mt-1 text-sm text-muted-foreground">
            These tools are available only to the LineUp administrator.
          </p>
        </section>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage title="Developer Tools">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-5 text-sm text-muted-foreground">
          Load sample content or unlock achievements for testing.
        </p>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 rounded-xl border-2"
            onClick={() => seedData.mutate()}
            disabled={seedData.isPending}
            data-testid="button-seed-data"
          >
            {seedData.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4" />
            )}
            {seedData.isPending ? "Loading..." : "Load Test Data"}
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-2 rounded-xl border-2"
            onClick={() => grantAllAchievements.mutate()}
            disabled={grantAllAchievements.isPending}
            data-testid="button-reward-all-badges"
          >
            {grantAllAchievements.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trophy className="h-4 w-4" />
            )}
            {grantAllAchievements.isPending
              ? "Rewarding..."
              : "Reward All Badges"}
          </Button>
        </div>
      </section>
    </SettingsPage>
  );
}

export function DangerZoneSettings() {
  const deleteData = useDeleteData();
  const { toast } = useToast();

  const handleDelete = async (type: "sessions" | "songs" | "all") => {
    try {
      await deleteData.mutateAsync(type);
      toast({ title: "Deleted successfully." });
    } catch {
      toast({
        title: "Delete failed",
        variant: "destructive",
      });
    }
  };

  return (
    <SettingsPage title="Danger Zone">
      <section className="rounded-2xl border border-red-100 bg-red-50/50 p-5 dark:border-[#3A3230] dark:bg-[#2A2622]">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </div>

        <h2 className="mb-2 text-lg font-semibold text-destructive">
          Permanent data deletion
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          These actions cannot be undone. Choose carefully.
        </p>

        <div className="space-y-3">
          <DeleteDialog
            title="Delete Session Data?"
            description="This will permanently remove all your tracked dance sessions."
            onConfirm={() => handleDelete("sessions")}
            triggerLabel="Delete Session Data"
          />

          <DeleteDialog
            title="Delete Song Library?"
            description="This will permanently remove every song in your library."
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
    </SettingsPage>
  );
}