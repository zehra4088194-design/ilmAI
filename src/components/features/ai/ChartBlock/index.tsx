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

function parseSpec(raw: string): ChartSpec | null {
  try {
    const spec = JSON.parse(raw) as ChartSpec;
    if (!spec || !Array.isArray(spec.series) || spec.series.length === 0) return null;
    if (!['line', 'bar', 'scatter', 'pie'].includes(spec.type)) return null;
    return spec;
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
              <YAxis stroke="currentColor" label={spec.yLabel ? { value: spec.yLabel, angle: -90, position: 'insideLeft' } : undefined} />
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
                <Scatter key={series.name} name={series.name} data={series.points} fill={series.color || COLORS[index % COLORS.length]} />
              ))}
            </ScatterChart>
          ) : (
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis
                dataKey="x"
                type="number"
                domain={['dataMin', 'dataMax']}
                stroke="currentColor"
                label={spec.xLabel ? { value: spec.xLabel, position: 'insideBottom', offset: -5 } : undefined}
              />
              <YAxis stroke="currentColor" label={spec.yLabel ? { value: spec.yLabel, angle: -90, position: 'insideLeft' } : undefined} />
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
