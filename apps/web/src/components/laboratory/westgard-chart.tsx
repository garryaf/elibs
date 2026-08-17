"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeveyJenningsDataPoint {
  date: string;
  value: number;
  westgardPass: boolean;
  violatedRule?: string | null;
}

export interface WestgardChartProps {
  /** Chart data points (QC results over time) */
  data: LeveyJenningsDataPoint[];
  /** Expected mean value for the QC sample/test */
  mean: number;
  /** Expected standard deviation */
  sd: number;
  /** Chart title (test name + QC sample) */
  title?: string;
  /** Height in pixels */
  height?: number;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as LeveyJenningsDataPoint | undefined;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">
        Nilai: {point.value.toFixed(2)}
      </p>
      <p
        className={`text-xs font-medium ${point.westgardPass ? "text-green-600" : "text-red-600"}`}
      >
        {point.westgardPass ? "✓ Pass" : `✗ Fail (${point.violatedRule || "violation"})`}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart color tokens (mapped to CSS custom properties from globals.css)
// ---------------------------------------------------------------------------

const CHART_COLORS = {
  success: "var(--color-chart-success, #22c55e)",
  danger: "var(--color-chart-danger, #ef4444)",
  warning: "var(--color-chart-warning, #f59e0b)",
  info: "var(--color-chart-info, #3b82f6)",
  line: "var(--color-chart-line, #6366f1)",
} as const;

// ---------------------------------------------------------------------------
// Custom Dot renderer — color pass/fail
// ---------------------------------------------------------------------------

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  if (!payload) return null;

  const color = payload.westgardPass ? CHART_COLORS.success : CHART_COLORS.danger;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={color}
      stroke={color}
      strokeWidth={1.5}
    />
  );
}

// ---------------------------------------------------------------------------
// WestgardChart Component (Levey-Jennings)
// ---------------------------------------------------------------------------

export function WestgardChart({
  data,
  mean,
  sd,
  title,
  height = 300,
}: WestgardChartProps) {
  // Calculate SD zones
  const plus1SD = mean + sd;
  const plus2SD = mean + 2 * sd;
  const plus3SD = mean + 3 * sd;
  const minus1SD = mean - sd;
  const minus2SD = mean - 2 * sd;
  const minus3SD = mean - 3 * sd;

  // Y-axis domain: extend slightly beyond ±3SD
  const yMin = Math.min(minus3SD - sd * 0.5, ...data.map((d) => d.value));
  const yMax = Math.max(plus3SD + sd * 0.5, ...data.map((d) => d.value));

  return (
    <div className="w-full">
      {title && (
        <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      )}
      {/* Legend */}
      <div className="mb-2 flex flex-wrap items-center gap-4 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-blue-500" /> Mean
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 border-t border-dashed border-green-500" /> ±1SD
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 border-t border-dashed border-amber-500" /> ±2SD
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 border-t border-dashed border-red-500" /> ±3SD
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "var(--color-muted-foreground, #6b7280)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border, #e5e7eb)" }}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 10, fill: "var(--color-muted-foreground, #6b7280)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border, #e5e7eb)" }}
            tickFormatter={(v) => v.toFixed(1)}
          />

          <Tooltip content={<ChartTooltip />} />

          {/* ±3SD zone (red) */}
          <ReferenceLine
            y={plus3SD}
            stroke={CHART_COLORS.danger}
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{ value: "+3SD", position: "right", fontSize: 9, fill: CHART_COLORS.danger }}
          />
          <ReferenceLine
            y={minus3SD}
            stroke={CHART_COLORS.danger}
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{ value: "-3SD", position: "right", fontSize: 9, fill: CHART_COLORS.danger }}
          />

          {/* ±2SD zone (amber) */}
          <ReferenceLine
            y={plus2SD}
            stroke={CHART_COLORS.warning}
            strokeDasharray="3 3"
            strokeWidth={1}
            label={{ value: "+2SD", position: "right", fontSize: 9, fill: CHART_COLORS.warning }}
          />
          <ReferenceLine
            y={minus2SD}
            stroke={CHART_COLORS.warning}
            strokeDasharray="3 3"
            strokeWidth={1}
            label={{ value: "-2SD", position: "right", fontSize: 9, fill: CHART_COLORS.warning }}
          />

          {/* ±1SD zone (green) */}
          <ReferenceLine
            y={plus1SD}
            stroke={CHART_COLORS.success}
            strokeDasharray="2 2"
            strokeWidth={1}
            label={{ value: "+1SD", position: "right", fontSize: 9, fill: CHART_COLORS.success }}
          />
          <ReferenceLine
            y={minus1SD}
            stroke={CHART_COLORS.success}
            strokeDasharray="2 2"
            strokeWidth={1}
            label={{ value: "-1SD", position: "right", fontSize: 9, fill: CHART_COLORS.success }}
          />

          {/* Mean line (blue) */}
          <ReferenceLine
            y={mean}
            stroke={CHART_COLORS.info}
            strokeWidth={2}
            label={{ value: "Mean", position: "right", fontSize: 10, fill: CHART_COLORS.info }}
          />

          {/* QC result data line */}
          <Line
            type="monotone"
            dataKey="value"
            stroke={CHART_COLORS.line}
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 6, stroke: CHART_COLORS.line, strokeWidth: 2, fill: "var(--color-background, #fff)" }}
            name="QC Result"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
