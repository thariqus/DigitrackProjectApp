import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import {
  getEmailDashboardStats,
  type EmailDashboardStats,
  type EmailDailySent,
  type EmailStatTile,
  type EmailStatusBreakdown,
} from "@/hooks/email_stats";
import { EmailList } from "./EmailList";

const CHART_INK = {
  surface: "#fcfcfb",
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  baseline: "#c3c2b7",
};
const SEQUENTIAL_BLUE = "#2a78d6";

const STATUS_STYLE: Record<string, { color: string; Icon: typeof CheckCircle2 }> = {
  sent: { color: "#0ca30c", Icon: CheckCircle2 },
  pending: { color: "#fab219", Icon: Clock },
  failed: { color: "#d03b3b", Icon: XCircle },
};

function niceMax(value: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(value, 1))));
  const normalized = value / magnitude;
  const step = normalized <= 2 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function StatTile({ label, value, delta, delta_good }: EmailStatTile) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-100/60 p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-tight text-gray-900 mt-1">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className={`text-xs mt-1 ${delta_good ? "text-[#006300]" : "text-[#d03b3b]"}`}>
        {delta}
      </p>
    </div>
  );
}

function DailySentBarChart({ dailySent }: { dailySent: EmailDailySent[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const width = 640;
  const height = 220;
  const marginLeft = 36;
  const marginBottom = 24;
  const marginTop = 12;
  const plotWidth = width - marginLeft;
  const plotHeight = height - marginBottom - marginTop;

  const maxValue = useMemo(
    () => niceMax(Math.max(...dailySent.map((d) => d.count), 1)),
    [dailySent]
  );
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) =>
    Math.round((maxValue * fraction) / 5) * 5
  );

  const bandWidth = plotWidth / dailySent.length;
  const barWidth = Math.min(24, bandWidth * 0.5);
  // Thin the x-axis labels to roughly 8 when there are enough bars (a 30-day
  // view) that every label would otherwise overlap its neighbors.
  const labelStep = Math.max(1, Math.ceil(dailySent.length / 8));

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-100/60 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Emails sent — last 30 days</h2>
          <p className="text-xs text-muted-foreground">Daily send volume</p>
        </div>
        <button
          type="button"
          onClick={() => setShowTable((prev) => !prev)}
          className="text-xs text-[#972e26] underline shrink-0"
        >
          {showTable ? "View chart" : "View as table"}
        </button>
      </div>

      {showTable ? (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 font-medium">Day</th>
              <th className="py-1 font-medium">Emails sent</th>
            </tr>
          </thead>
          <tbody>
            {dailySent.map((d) => (
              <tr key={d.date} className="border-t border-rose-200/60">
                <td className="py-1">{d.day}</td>
                <td className="py-1">{d.count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative rounded-xl bg-white/70 p-2">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full"
            style={{ maxHeight: 260 }}
            role="img"
            aria-label="Bar chart of emails sent per day over the last 30 days"
          >
            {ticks.map((tick) => {
              const y = marginTop + plotHeight - (tick / maxValue) * plotHeight;
              return (
                <g key={tick}>
                  <line
                    x1={marginLeft}
                    x2={width}
                    y1={y}
                    y2={y}
                    stroke={CHART_INK.grid}
                    strokeWidth={1}
                  />
                  <text
                    x={marginLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    fontSize={10}
                    fill={CHART_INK.muted}
                  >
                    {tick.toLocaleString()}
                  </text>
                </g>
              );
            })}
            <line
              x1={marginLeft}
              x2={marginLeft}
              y1={marginTop}
              y2={marginTop + plotHeight}
              stroke={CHART_INK.baseline}
              strokeWidth={1}
            />
            <line
              x1={marginLeft}
              x2={width}
              y1={marginTop + plotHeight}
              y2={marginTop + plotHeight}
              stroke={CHART_INK.baseline}
              strokeWidth={1}
            />

            {dailySent.map((d, index) => {
              const barHeight = (d.count / maxValue) * plotHeight;
              const bandX = marginLeft + index * bandWidth;
              const x = bandX + (bandWidth - barWidth) / 2;
              const y = marginTop + plotHeight - barHeight;
              const isHovered = hoveredIndex === index;

              return (
                <g key={d.date}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={4}
                    fill={SEQUENTIAL_BLUE}
                    opacity={isHovered ? 0.85 : 1}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onFocus={() => setHoveredIndex(index)}
                    onBlur={() => setHoveredIndex(null)}
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                  >
                    <title>{`${d.day}: ${d.count.toLocaleString()} emails sent`}</title>
                  </rect>
                  {index % labelStep === 0 && (
                    <text
                      x={bandX + bandWidth / 2}
                      y={marginTop + plotHeight + 16}
                      textAnchor="middle"
                      fontSize={10}
                      fill={CHART_INK.muted}
                    >
                      {d.day}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {hoveredIndex !== null && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-rose-200 bg-white px-2 py-1 text-xs shadow-sm"
              style={{
                left: `${
                  ((marginLeft + hoveredIndex * bandWidth + bandWidth / 2) / width) * 100
                }%`,
                top: `${
                  ((marginTop +
                    plotHeight -
                    (dailySent[hoveredIndex].count / maxValue) * plotHeight) /
                    height) *
                  100
                }%`,
              }}
            >
              <p className="font-semibold text-gray-900">
                {dailySent[hoveredIndex].count.toLocaleString()}
              </p>
              <p className="text-muted-foreground">{dailySent[hoveredIndex].day}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBreakdownChart({ breakdown }: { breakdown: EmailStatusBreakdown[] }) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  const total = breakdown.reduce((sum, item) => sum + item.value, 0);
  const width = 640;
  const barHeight = 28;
  const gap = 2;

  let cursor = 0;
  const segments = breakdown.map((item) => {
    const segmentWidth = total ? (item.value / total) * width : 0;
    const segment = { ...item, x: cursor, width: segmentWidth };
    cursor += segmentWidth;
    return segment;
  });

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-100/60 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Send status breakdown</h2>
          <p className="text-xs text-muted-foreground">
            {total.toLocaleString()} total emails this period
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowTable((prev) => !prev)}
          className="text-xs text-[#972e26] underline shrink-0"
        >
          {showTable ? "View chart" : "View as table"}
        </button>
      </div>

      {showTable ? (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 font-medium">Status</th>
              <th className="py-1 font-medium">Count</th>
              <th className="py-1 font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((item) => (
              <tr key={item.key} className="border-t border-rose-200/60">
                <td className="py-1">{item.label}</td>
                <td className="py-1">{item.value.toLocaleString()}</td>
                <td className="py-1">{total ? ((item.value / total) * 100).toFixed(1) : "0.0"}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="rounded-xl bg-white/70 p-3 space-y-3">
          <svg
            viewBox={`0 0 ${width} ${barHeight}`}
            className="w-full"
            role="img"
            aria-label="Stacked bar showing sent and pending email counts"
          >
            {segments.map((segment) => {
              const isHovered = hoveredKey === segment.key;
              const labelFits = segment.width > 48;
              const color = STATUS_STYLE[segment.key]?.color ?? CHART_INK.muted;
              return (
                <g key={segment.key}>
                  <rect
                    x={segment.x + (segment.x > 0 ? gap / 2 : 0)}
                    y={0}
                    width={Math.max(segment.width - gap, 0)}
                    height={barHeight}
                    rx={4}
                    fill={color}
                    opacity={isHovered ? 0.85 : 1}
                    onMouseEnter={() => setHoveredKey(segment.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    onFocus={() => setHoveredKey(segment.key)}
                    onBlur={() => setHoveredKey(null)}
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                  >
                    <title>{`${segment.label}: ${segment.value.toLocaleString()} (${(
                      total ? (segment.value / total) * 100 : 0
                    ).toFixed(1)}%)`}</title>
                  </rect>
                  {labelFits && (
                    <text
                      x={segment.x + segment.width / 2}
                      y={barHeight / 2 + 4}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={600}
                      fill="#ffffff"
                    >
                      {segment.value.toLocaleString()}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          <div className="flex flex-wrap gap-4">
            {breakdown.map((item) => {
              const Icon = STATUS_STYLE[item.key]?.Icon ?? Clock;
              const color = STATUS_STYLE[item.key]?.color ?? CHART_INK.muted;
              return (
                <div key={item.key} className="flex items-center gap-1.5 text-xs">
                  <Icon className="h-3.5 w-3.5" style={{ color }} />
                  <span className="text-gray-700">{item.label}</span>
                  <span className="text-muted-foreground">
                    {total ? ((item.value / total) * 100).toFixed(1) : "0.0"}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function EmailDashboard() {
  const [stats, setStats] = useState<EmailDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getEmailDashboardStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Emails you've sent through DigiTrack, based on the JH Emails log.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading email stats…</p>
      ) : !stats ? (
        <p className="text-sm text-muted-foreground">
          Couldn't load email stats. Please try again.
        </p>
      ) : !stats.has_sent_emails ? (
        <p className="text-sm text-muted-foreground">You didn't send any email.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.stat_tiles!.map((tile) => (
              <StatTile key={tile.label} {...tile} />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <DailySentBarChart dailySent={stats.daily_sent!} />
            <StatusBreakdownChart breakdown={stats.status_breakdown!} />
          </div>

          <EmailList />
        </>
      )}
    </div>
  );
}

export default EmailDashboard;
