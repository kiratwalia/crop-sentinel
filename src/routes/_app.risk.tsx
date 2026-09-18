import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Bug,
  CloudRain,
  Droplets,
  Leaf,
  Thermometer,
  Wind,
} from "lucide-react";
import { AppShell } from "@/components/cropcare/app-shell";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { crops } from "@/data/mock";
import { useGeolocation } from "@/hooks/use-geolocation";
import { getWeather } from "@/lib/services/cropcare";
import {
  fetchAllCropRisksApi,
  fetchCropRiskApi,
  fetchRiskForecastApi,
} from "@/lib/services/riskApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/risk")({
  head: () => ({
    meta: [
      { title: "Risk Monitor — CropCare AI" },
      {
        name: "description",
        content:
          "Temperature, humidity, rainfall and wind turned into real-time disease, pest and environmental risk scores with a 7-day outlook.",
      },
      { property: "og:title", content: "Risk Monitor — CropCare AI" },
      {
        property: "og:description",
        content: "Weather-driven disease and pest risk for the week ahead.",
      },
    ],
  }),
  component: RiskPage,
});

function riskWord(value: number) {
  if (value >= 75) {
    return {
      label: "Severe",
      tone: "text-danger",
      advice: "Inspect fields daily.",
    };
  }

  if (value >= 60) {
    return {
      label: "High",
      tone: "text-danger",
      advice: "Inspect every two days.",
    };
  }

  if (value >= 40) {
    return {
      label: "Moderate",
      tone: "text-warning",
      advice: "Weekly scouting is enough.",
    };
  }

  return {
    label: "Low",
    tone: "text-success",
    advice: "Keep to your normal routine.",
  };
}

function RiskPage() {
  const geo = useGeolocation();
  const [selectedCrop, setSelectedCrop] = useState<string>("potato");

  const weather = useQuery({
    queryKey: ["weather", geo.lat, geo.lng],
    queryFn: () => getWeather(geo.lat, geo.lng),
  });

  const cropRiskQuery = useQuery({
    queryKey: ["risk-crop", selectedCrop, geo.lat, geo.lng],
    queryFn: () =>
      fetchCropRiskApi(selectedCrop, {
        lat: geo.lat,
        lng: geo.lng,
      }),
  });

  const allCropsQuery = useQuery({
    queryKey: ["risk-all-crops", geo.lat, geo.lng],
    queryFn: () =>
      fetchAllCropRisksApi({
        lat: geo.lat,
        lng: geo.lng,
      }),
  });

  const forecastQuery = useQuery({
    queryKey: ["risk-forecast", selectedCrop, geo.lat, geo.lng],
    queryFn: () =>
      fetchRiskForecastApi(selectedCrop, {
        lat: geo.lat,
        lng: geo.lng,
      }),
  });

  const w = weather.data;

  const weatherCards = w
    ? [
        {
          icon: Thermometer,
          label: "Temperature",
          value: `${w.temperatureC}°C`,
          note:
            w.temperatureC >= 25
              ? "Warm — favours fungal & pest growth"
              : "Moderate temperature",
        },
        {
          icon: Droplets,
          label: "Humidity",
          value: `${w.humidity}%`,
          note:
            w.humidity >= 75
              ? "High humidity — leaves stay wet"
              : "Moderate moisture levels",
        },
        {
          icon: CloudRain,
          label: "Rainfall (24h)",
          value: `${w.rainfallMm} mm`,
          note:
            w.rainfallMm > 2
              ? "Rain splash can spread spores"
              : "Dry canopy conditions",
        },
        {
          icon: Wind,
          label: "Wind",
          value: `${w.windKph} km/h`,
          note:
            w.windKph > 15
              ? "Moderate breeze — aids dispersal"
              : "Light wind speed",
        },
      ]
    : [];

  const scores = cropRiskQuery.data?.scores;

  const forecastDays = forecastQuery.data?.forecast ?? [];

  const highestRiskDay =
    forecastDays.length > 0
      ? forecastDays.reduce(
          (max, cur) => (cur.overall > max.overall ? cur : max),
          forecastDays[0],
        )
      : null;

  // Build real bar chart data from multi-crop endpoint
  const cropScoresMap = new Map(
    (allCropsQuery.data?.crops ?? []).map((item) => [
      item.crop.toLowerCase(),
      item.scores,
    ]),
  );

  const barChartData = crops.map((c) => {
    const s = cropScoresMap.get(c.id.toLowerCase());

    return {
      crop: c.name,
      disease: s?.disease ?? 0,
      pest: s?.pest ?? 0,
      overall: s?.overall ?? 0,
    };
  });

  return (
    <AppShell
      title="Risk monitor"
      subtitle={
        w?.location
          ? `${w.location} · Real-time agronomic risk engine`
          : "Weather-based disease and pest risk"
      }
    >
      <div className="space-y-5">
        {/* Crop Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Focus Crop:
          </span>

          {crops.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCrop(c.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                selectedCrop === c.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Current Weather Cards */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {weatherCards.map(({ icon: Icon, label, value, note }) => (
            <Card key={label} className="card-lift">
              <CardContent className="p-4">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-4.5" />
                </span>

                <p className="mt-3 font-display text-2xl font-bold">
                  {value}
                </p>

                <p className="text-sm font-medium">{label}</p>

                <p className="mt-1 text-xs text-muted-foreground">{note}</p>
              </CardContent>
            </Card>
          ))}

          {weather.isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36" />
            ))}
        </section>

        {/* Real Risk Scores Grid */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {scores &&
            [
              {
                key: "overall",
                label: "Overall risk",
                value: scores.overall,
                level: scores.risk_level,
                Icon: Activity,
              },
              {
                key: "disease",
                label: "Disease risk",
                value: scores.disease,
                level: riskWord(scores.disease).label.toLowerCase(),
                Icon: Leaf,
              },
              {
                key: "pest",
                label: "Pest risk",
                value: scores.pest,
                level: riskWord(scores.pest).label.toLowerCase(),
                Icon: Bug,
              },
              {
                key: "env",
                label: "Environmental risk",
                value: scores.environmental,
                level: riskWord(scores.environmental).label.toLowerCase(),
                Icon: CloudRain,
              },
            ].map(({ key, label, value, Icon }) => {
              const word = riskWord(value);

              return (
                <Card key={key} className="card-lift">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="size-4 text-primary" /> {label}
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`font-display text-3xl font-bold ${word.tone}`}
                      >
                        {value}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        / 100 · {word.label}
                      </span>
                    </div>

                    <Progress value={value} className="mt-3 h-2" />

                    <p className="mt-2 text-xs text-muted-foreground">
                      {word.advice}
                    </p>
                  </CardContent>
                </Card>
              );
            })}

          {cropRiskQuery.isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
        </section>

        {/* 7-Day Risk Outlook Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="capitalize">
                  7-day {selectedCrop} risk outlook
                </CardTitle>

                <CardDescription className="mt-1">
                  {highestRiskDay
                    ? `${highestRiskDay.day} (${highestRiskDay.date}) has the highest projected risk (${highestRiskDay.overall}/100 · ${riskWord(highestRiskDay.overall).label}) — plan field actions before then`
                    : "Projected daily risk values calculated from 7-day weather forecast"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="h-72 w-full">
              {forecastQuery.isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={forecastDays}
                    margin={{ left: -20, right: 8, top: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />

                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-card)",
                        fontSize: 12,
                      }}
                    />

                    <Legend wrapperStyle={{ fontSize: 12 }} />

                    <Line
                      type="monotone"
                      dataKey="overall"
                      name="Overall"
                      stroke="var(--color-chart-5)"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />

                    <Line
                      type="monotone"
                      dataKey="disease"
                      name="Disease"
                      stroke="var(--color-chart-3)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />

                    <Line
                      type="monotone"
                      dataKey="pest"
                      name="Pest"
                      stroke="var(--color-chart-2)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />

                    <Line
                      type="monotone"
                      dataKey="environmental"
                      name="Environmental"
                      stroke="var(--color-chart-1)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Risk by Crop Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Risk by crop</CardTitle>

            <CardDescription>
              Live comparative disease and pest pressure across supported crops
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="h-72 w-full">
              {allCropsQuery.isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barChartData}
                    margin={{ left: -20, right: 8, top: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="crop"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />

                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />

                    <Tooltip
                      cursor={{ fill: "var(--color-muted)" }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-card)",
                        fontSize: 12,
                      }}
                    />

                    <Legend wrapperStyle={{ fontSize: 12 }} />

                    <Bar
                      dataKey="overall"
                      name="Overall"
                      fill="var(--color-chart-5)"
                      radius={[6, 6, 0, 0]}
                    />

                    <Bar
                      dataKey="disease"
                      name="Disease"
                      fill="var(--color-chart-3)"
                      radius={[6, 6, 0, 0]}
                    />

                    <Bar
                      dataKey="pest"
                      name="Pest"
                      fill="var(--color-chart-2)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}