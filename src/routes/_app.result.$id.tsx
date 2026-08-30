import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Eye,
  Leaf,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/cropcare/app-shell";
import { DemoBadge, RiskBadge, SeverityBadge } from "@/components/cropcare/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { DEMO_NOTICE, cropById } from "@/data/mock";
import { getAnalysis, getFinding } from "@/lib/services/cropcare";

export const Route = createFileRoute("/_app/result/$id")({
  head: () => ({
    meta: [
      { title: "Analysis Result — CropCare AI" },
      {
        name: "description",
        content:
          "Predicted crop disease or pest with confidence, severity, symptoms, immediate actions, prevention steps and environmental risk factors.",
      },
      { property: "og:title", content: "Analysis Result — CropCare AI" },
      {
        property: "og:description",
        content: "See the predicted disease or pest, how serious it looks, and what to do first.",
      },
    ],
  }),
  component: ResultPage,
});

function ResultPage() {
  const { id } = Route.useParams();
  const [heatmap, setHeatmap] = useState(true);
  const { data: analysis, isLoading } = useQuery({
    queryKey: ["analysis", id],
    queryFn: () => getAnalysis(id),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <AppShell title="Analysis result">
        <Skeleton className="h-96 w-full" />
      </AppShell>
    );
  }

  if (!analysis) {
    return (
      <AppShell title="Analysis result">
        <Card>
          <CardContent className="p-10 text-center">
            <p className="font-medium">We could not find this analysis.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Demo analyses are kept for the current session only.
            </p>
            <Button asChild className="mt-5">
              <Link to="/analyze">Run a new analysis</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const finding = getFinding(analysis.findingId)!;
  const crop = cropById(analysis.cropId)!;

  return (
    <AppShell
      title={finding.name}
      subtitle={`${crop.emoji} ${crop.name} · analysis ${analysis.id}`}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link to="/analyze">
            <RefreshCw className="size-4" />{" "}
            <span className="hidden sm:inline">Analyze another</span>
          </Link>
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/40 bg-warning-soft/50 p-3 text-sm text-muted-foreground">
          <DemoBadge />
          <span>{DEMO_NOTICE}</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
          {/* Image + heatmap */}
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <div>
                <CardTitle>Your photo</CardTitle>
                <CardDescription>Uploaded leaf sample</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="heat" className="text-xs text-muted-foreground">
                  Attention map
                </Label>
                <Switch id="heat" checked={heatmap} onCheckedChange={setHeatmap} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-hidden rounded-xl border border-border">
                <img
                  src={analysis.imageUrl}
                  alt={`${crop.name} leaf analysed for ${finding.name}`}
                  className="h-72 w-full object-cover"
                />
                {heatmap && (
                  <>
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(circle at 38% 44%, rgba(239,68,68,0.55), rgba(245,158,11,0.35) 32%, transparent 58%), radial-gradient(circle at 68% 66%, rgba(239,68,68,0.4), transparent 45%)",
                      }}
                    />
                    <span className="absolute bottom-3 left-3 rounded-full bg-background/85 px-3 py-1 text-[11px] font-medium">
                      Placeholder attention map
                    </span>
                  </>
                )}
              </div>
              <div className="mt-4 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <Eye className="size-4 text-primary" /> How the model explains itself
                </p>
                <p className="mt-1.5">
                  In the full system this overlay is a Grad-CAM heat map showing which parts of the
                  leaf pushed the prediction. Here it is a visual placeholder so you can see where
                  the explanation will appear.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Prediction */}
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      finding.kind === "pest"
                        ? "bg-accent/25 text-accent-foreground"
                        : "bg-primary/12 text-primary"
                    }`}
                  >
                    <Leaf className="size-3.5" />
                    {finding.kind === "pest" ? "Pest" : "Disease"}
                  </span>
                  <SeverityBadge severity={analysis.severity} />
                  <RiskBadge risk={analysis.riskLevel} />
                </div>
                <CardTitle className="mt-3 text-2xl">{finding.name}</CardTitle>
                <CardDescription className="italic">{finding.scientificName}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{finding.summary}</p>
                <div className="mt-5 space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Model confidence (illustrative)</span>
                      <span className="font-semibold">{analysis.confidence}%</span>
                    </div>
                    <Progress value={analysis.confidence} className="mt-1.5 h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Affected leaf area</span>
                      <span className="font-semibold">{analysis.affectedArea}%</span>
                    </div>
                    <Progress value={analysis.affectedArea} className="mt-1.5 h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-danger/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-danger">
                  <AlertTriangle className="size-4" /> Do this first
                </CardTitle>
                <CardDescription>Immediate actions for the next 24-48 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2.5 text-sm">
                  {finding.immediateActions.map((a, i) => (
                    <li key={a} className="flex gap-3">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-danger-soft text-[11px] font-bold text-danger">
                        {i + 1}
                      </span>
                      {a}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Symptoms to confirm</CardTitle>
              <CardDescription>Match these against your plants</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {finding.symptoms.map((s) => (
                  <li key={s} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-success" /> Prevention
              </CardTitle>
              <CardDescription>Stop it coming back next season</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {finding.prevention.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" />
                    {p}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Treatment options</CardTitle>
              <CardDescription>Follow the label dose and safety gear</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-success">Organic</p>
                <ul className="mt-1.5 space-y-1 text-muted-foreground">
                  {finding.organicOptions.map((o) => (
                    <li key={o}>• {o}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-warning">Chemical</p>
                <ul className="mt-1.5 space-y-1 text-muted-foreground">
                  {finding.chemicalOptions.map((o) => (
                    <li key={o}>• {o}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Environmental risk factors
            </CardTitle>
            <CardDescription>
              Why the weather around your field is helping this problem spread
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {analysis.envFactors.map((f) => (
                <div key={f.label} className="rounded-xl border border-border p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="font-display text-lg font-semibold">{f.value}</p>
                  </div>
                  <Progress value={f.contribution} className="mt-2 h-1.5" />
                  <p className="mt-2 text-xs text-muted-foreground">{f.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/risk">
                  Open risk monitor <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/recommendations">See recommendations</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/history">Saved to history</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
