import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowRight, ScanLine, Search } from "lucide-react";
import { AppShell } from "@/components/cropcare/app-shell";
import { DemoBadge, SeverityBadge } from "@/components/cropcare/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { crops, cropById } from "@/data/mock";
import { getFinding, getHistory } from "@/lib/services/cropcare";
import type { Severity } from "@/types";

export const Route = createFileRoute("/_app/history")({
  head: () => ({
    meta: [
      { title: "Analysis History — CropCare AI" },
      {
        name: "description",
        content:
          "Every leaf analysis you have run, with crop, predicted disease or pest, confidence, severity and date.",
      },
      { property: "og:title", content: "Analysis History — CropCare AI" },
      {
        property: "og:description",
        content: "Look back at past crop checks and compare how your field is changing.",
      },
    ],
  }),
  component: HistoryPage,
});

const severities: (Severity | "all")[] = ["all", "low", "moderate", "high", "critical"];

function HistoryPage() {
  const { data, isLoading } = useQuery({ queryKey: ["history"], queryFn: getHistory });
  const [crop, setCrop] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    return (data ?? []).filter((a) => {
      const finding = getFinding(a.findingId);
      const matchesCrop = crop === "all" || a.cropId === crop;
      const matchesSeverity = severity === "all" || a.severity === severity;
      const text = `${finding?.name ?? ""} ${cropById(a.cropId)?.name ?? ""}`.toLowerCase();
      return matchesCrop && matchesSeverity && text.includes(query.trim().toLowerCase());
    });
  }, [data, crop, severity, query]);

  return (
    <AppShell
      title="Analysis history"
      subtitle="All your past crop checks in one place"
      actions={
        <Button asChild size="sm">
          <Link to="/analyze">
            <ScanLine className="size-4" /> <span className="hidden sm:inline">New analysis</span>
          </Link>
        </Button>
      }
    >
      <div className="space-y-5">
        <DemoBadge />

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by crop or disease name"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[{ id: "all", name: "All crops", emoji: "🌍" }, ...crops].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCrop(c.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    crop === c.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {c.emoji} {c.name}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {severities.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                    severity === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {s === "all" ? "All severity" : s}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {isLoading && <Skeleton className="h-64" />}

        {!isLoading && rows.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center">
              <p className="font-medium">No analyses match these filters.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try clearing the search or picking another crop.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3">
          {rows.map((a) => {
            const finding = getFinding(a.findingId);
            const cropInfo = cropById(a.cropId);
            return (
              <Link
                key={a.id}
                to="/result/$id"
                params={{ id: a.id }}
                className="card-lift flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center"
              >
                <img
                  src={a.imageUrl}
                  alt={`${cropInfo?.name} leaf sample`}
                  className="h-32 w-full rounded-lg object-cover sm:size-16"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{finding?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {cropInfo?.emoji} {cropInfo?.name} · {a.confidence}% confidence ·{" "}
                    {a.mode === "auto" ? "Automatic" : a.mode === "pest" ? "Pest" : "Disease"} mode
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <SeverityBadge severity={a.severity} />
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
