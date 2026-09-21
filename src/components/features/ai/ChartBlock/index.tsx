'use client';

import { useMemo } from 'react';
import { evaluate } from 'mathjs';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const COLORS = ['#7c3aed', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#14b8a6', '#a855f7'];
const MAX_FN_STEPS = 200;

type ChartPoint = { x: number | string; y: number };

type ChartSeries = {
  name: string;
  color?: string;
  // Discrete data — used as-is for bar/pie, or line/scatter series that aren't a plotted function.
  data?: ChartPoint[];
  // A plotted math function instead of hand-typed points — e.g. "x^2", "sin(x) + 1", "2x + 3".
  // Evaluated client-side with mathjs (never the model's own arithmetic), sampled evenly across
  // [xMin, xMax] — this is what makes graphs reliable even from a small/cheap model: it only has
  // to state the function and a sensible range correctly, not hand-compute dozens of (x, y) pairs.
  fn?: string;
  xMin?: number;
  xMax?: number;
  steps?: number;
};

type ChartSpec = {
  type: 'line' | 'bar' | 'scatter' | 'pie';
  title?: string;
  xLabel?: string;
  yLabel?: string;
  series: ChartSeries[];
};

const CHART_TYPES = new Set<ChartSpec['type']>(['line', 'bar', 'scatter', 'pie']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asChartPoint(value: unknown, fallbackX?: string | number): ChartPoint | null {
  if (typeof value === 'number' && Number.isFinite(value) && fallbackX !== undefined) {
    return { x: fallbackX, y: value };
  }
  if (!isRecord(value)) return null;
  const x = value.x ?? fallbackX;
  const y = value.y;
  if ((typeof x !== 'string' && typeof x !== 'number') || typeof y !== 'number' || !Number.isFinite(y)) return null;
  return { x, y };
}

function titleText(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (isRecord(value) && typeof value.text === 'string') return value.text;
  return undefined;
}

function axisTitle(scales: unknown, axis: 'x' | 'y'): string | undefined {
  if (!isRecord(scales)) return undefined;
  const config = scales[axis] ?? scales[`${axis}Axis`];
  if (!isRecord(config)) return undefined;
  return titleText(config.title);
}

function stripChartFence(raw: string): string {
  let value = raw.trim();
  let previous = '';
  while (value !== previous) {
    previous = value;
    const match = /^```(?:chart|json)?\s*([\s\S]*?)\s*```$/i.exec(value);
    value = match ? match[1].trim() : value;
  }
  return value;
}

function resolveSeriesData(series: ChartSeries): ChartPoint[] {
  if (series.fn) {
    const xMin = Number.isFinite(series.xMin) ? (series.xMin as number) : -10;
    const xMax = Number.isFinite(series.xMax) ? (series.xMax as number) : 10;
    const steps = Math.min(MAX_FN_STEPS, Math.max(2, Math.round(series.steps ?? 60)));
    const points: ChartPoint[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const x = xMin + ((xMax - xMin) * i) / steps;
      try {
        const y = evaluate(series.fn, { x });
        if (typeof y === 'number' && Number.isFinite(y)) {
          points.push({ x: Number(x.toFixed(6)), y: Number(y.toFixed(6)) });
        }
      } catch {
        // One bad sample (e.g. tan(x) near an asymptote) shouldn't drop the whole series.
      }
    }
    return points;
  }
  return Array.isArray(series.data) ? series.data : [];
}

// Exported so AiAnswerRenderer can also recognize a chart spec that a model emitted in a
// mistagged fence (```json or unlabeled ```) instead of the documented ```chart — a weaker/free
// model occasionally forgets the exact tag even when the data itself is real.
export function parseSpec(raw: string): ChartSpec | null {
  try {
    const input = JSON.parse(stripChartFence(raw)) as unknown;
    if (!isRecord(input) || typeof input.type !== 'string' || !CHART_TYPES.has(input.type as ChartSpec['type']))
      return null;

    const type = input.type as ChartSpec['type'];
    const title = titleText(input.title);
    const nativeSeries = input.series;
    if (Array.isArray(nativeSeries) && nativeSeries.length > 0) {
      const series = nativeSeries.filter(isRecord).map((item, index): ChartSeries => ({
        name: typeof item.name === 'string' ? item.name : `Series ${index + 1}`,
        color: typeof item.color === 'string' ? item.color : undefined,
        data: Array.isArray(item.data)
          ? item.data.map((point) => asChartPoint(point)).filter((point): point is ChartPoint => point !== null)
          : undefined,
        fn: typeof item.fn === 'string' ? item.fn : undefined,
        xMin: typeof item.xMin === 'number' ? item.xMin : undefined,
        xMax: typeof item.xMax === 'number' ? item.xMax : undefined,
        steps: typeof item.steps === 'number' ? item.steps : undefined,
      }));
      if (series.length === 0) return null;
      return {
        type,
        title,
        xLabel: typeof input.xLabel === 'string' ? input.xLabel : undefined,
        yLabel: typeof input.yLabel === 'string' ? input.yLabel : undefined,
        series,
      };
    }

    const data = input.data;
    if (!isRecord(data) || !Array.isArray(data.datasets) || data.datasets.length === 0) return null;
    const labels = Array.isArray(data.labels) ? data.labels : [];
    const series = data.datasets
      .filter(isRecord)
      .map((dataset, index): ChartSeries => {
        const values = Array.isArray(dataset.data) ? dataset.data : [];
        const points = values
          .map((value, valueIndex) => asChartPoint(value, labels[valueIndex] as string | number | undefined))
          .filter((point): point is ChartPoint => point !== null);
        return {
          name: typeof dataset.label === 'string' ? dataset.label : `Series ${index + 1}`,
          color: typeof dataset.backgroundColor === 'string' ? dataset.backgroundColor : undefined,
          data: points,
        };
      })
      .filter((series) => series.data && series.data.length > 0);
    if (series.length === 0) return null;

    const options = isRecord(input.options) ? input.options : undefined;
    const scales = options?.scales;
    return {
      type,
      title,
      xLabel: axisTitle(scales, 'x'),
      yLabel: axisTitle(scales, 'y'),
      series,
    };
  } catch {
    return null;
  }
}

const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' };

/**
 * Renders a ```chart fenced code block (see AiAnswerRenderer) as an actual graph instead of raw
 * JSON text. A malformed or unparsable spec falls back to showing the raw block rather than
 * silently disappearing, so a small model's occasional formatting slip is visible, not invisible.
 */
export function ChartBlock({ spec: raw }: { spec: string }) {
  const spec = useMemo(() => parseSpec(raw), [raw]);
  const resolvedSeries = useMemo(
    () => (spec ? spec.series.map((series) => ({ ...series, points: resolveSeriesData(series) })) : []),
    [spec]
  );
  const lineUsesNumericXAxis = resolvedSeries.every((series) =>
    series.points.every((point) => typeof point.x === 'number')
  );

  if (!spec) {
    return (
      <pre className="bg-muted/40 my-3 overflow-x-auto rounded-lg p-3 text-xs">
        <code>{raw}</code>
      </pre>
    );
  }

  return (
    <div className="not-prose border-border/70 bg-card my-4 rounded-xl border p-4">
      {spec.title && <p className="mb-2 text-sm font-semibold">{spec.title}</p>}
      <div className="h-64 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          {spec.type === 'pie' ? (
            <PieChart>
              <Pie
                data={resolvedSeries[0]?.points.map((p) => ({ name: String(p.x), value: p.y })) || []}
                dataKey="value"
                nameKey="name"
                outerRadius={80}
                label
              >
                {(resolvedSeries[0]?.points || []).map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          ) : spec.type === 'bar' ? (
            <BarChart>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis
                dataKey="x"
                type="category"
                allowDuplicatedCategory={false}
                stroke="currentColor"
                label={spec.xLabel ? { value: spec.xLabel, position: 'insideBottom', offset: -5 } : undefined}
              />
              <YAxis
                stroke="currentColor"
                label={spec.yLabel ? { value: spec.yLabel, angle: -90, position: 'insideLeft' } : undefined}
              />
              <Tooltip contentStyle={tooltipStyle} />
              {resolvedSeries.length > 1 && <Legend />}
              {resolvedSeries.map((series, index) => (
                <Bar
                  key={series.name}
                  name={series.name}
                  // Recharts' per-Bar `data` typings expect a narrower point shape than the mixed
                  // string|number x values a category axis actually accepts at runtime.
                  data={series.points as unknown as Record<string, unknown>[]}
                  dataKey="y"
                  fill={series.color || COLORS[index % COLORS.length]}
                />
              ))}
            </BarChart>
          ) : spec.type === 'scatter' ? (
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis
                dataKey="x"
                type="number"
                stroke="currentColor"
                label={spec.xLabel ? { value: spec.xLabel, position: 'insideBottom', offset: -5 } : undefined}
              />
              <YAxis
                dataKey="y"
                type="number"
                stroke="currentColor"
                label={spec.yLabel ? { value: spec.yLabel, angle: -90, position: 'insideLeft' } : undefined}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
              {resolvedSeries.length > 1 && <Legend />}
              {resolvedSeries.map((series, index) => (
                <Scatter
                  key={series.name}
                  name={series.name}
                  data={series.points}
                  fill={series.color || COLORS[index % COLORS.length]}
                />
              ))}
            </ScatterChart>
          ) : (
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis
                dataKey="x"
                type={lineUsesNumericXAxis ? 'number' : 'category'}
                domain={lineUsesNumericXAxis ? ['dataMin', 'dataMax'] : undefined}
                stroke="currentColor"
                label={spec.xLabel ? { value: spec.xLabel, position: 'insideBottom', offset: -5 } : undefined}
              />
              <YAxis
                stroke="currentColor"
                label={spec.yLabel ? { value: spec.yLabel, angle: -90, position: 'insideLeft' } : undefined}
              />
              <Tooltip contentStyle={tooltipStyle} />
              {resolvedSeries.length > 1 && <Legend />}
              {resolvedSeries.map((series, index) => (
                <Line
                  key={series.name}
                  name={series.name}
                  data={series.points}
                  type="monotone"
                  dataKey="y"
                  stroke={series.color || COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={series.points.length <= 20}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
