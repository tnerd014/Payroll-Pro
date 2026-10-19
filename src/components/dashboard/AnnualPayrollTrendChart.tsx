import React, { useState } from 'react';
import { TrendingUp, Calendar } from 'lucide-react';
import { formatNaira, formatCompactNaira } from '../../engine/payePensionEngine';

export interface MonthlyTrajectoryItem {
  key: string;
  label: string;
  shortLabel: string;
  headcount: number;
  gross: number;
  net: number;
  paye: number;
  pension: number;
  totalCost: number;
}

interface AnnualPayrollTrendChartProps {
  year: number;
  data: MonthlyTrajectoryItem[];
}

// Calculate smooth cubic Bezier path from points
function getBezierSpline(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

export const AnnualPayrollTrendChart: React.FC<AnnualPayrollTrendChartProps> = ({ year, data }) => {
  const [viewMode, setViewMode] = useState<'both' | 'gross-only' | 'net-only'>('both');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Determine max value for vertical scaling
  const maxGross = Math.max(...data.map(d => d.gross), 0);
  const maxNet = Math.max(...data.map(d => d.net), 0);
  const highestValue = Math.max(maxGross, maxNet);
  const chartMax = highestValue > 0 ? highestValue * 1.15 : 1000000;

  // Canvas bounds
  const svgWidth = 900;
  const svgHeight = 290;
  const paddingLeft = 65;
  const paddingRight = 35;
  const paddingTop = 30;
  const paddingBottom = 45;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // 4 horizontal grid ticks
  const ticksCount = 4;
  const yTicks = Array.from({ length: ticksCount + 1 }, (_, i) => {
    const val = (chartMax / ticksCount) * i;
    return {
      value: val,
      y: paddingTop + plotHeight - (val / chartMax) * plotHeight,
    };
  });

  // Calculate coordinates for points
  const pointsGross = data.map((item, idx) => {
    const x = paddingLeft + (idx / Math.max(data.length - 1, 1)) * plotWidth;
    const y = paddingTop + plotHeight - (item.gross / chartMax) * plotHeight;
    return { x, y, item, idx };
  });

  const pointsNet = data.map((item, idx) => {
    const x = paddingLeft + (idx / Math.max(data.length - 1, 1)) * plotWidth;
    const y = paddingTop + plotHeight - (item.net / chartMax) * plotHeight;
    return { x, y, item, idx };
  });

  const grossPath = getBezierSpline(pointsGross);
  const netPath = getBezierSpline(pointsNet);

  // Closed area paths for subtle gradient fills
  const grossAreaPath = pointsGross.length > 0
    ? `${grossPath} L ${pointsGross[pointsGross.length - 1].x} ${paddingTop + plotHeight} L ${pointsGross[0].x} ${paddingTop + plotHeight} Z`
    : '';

  const netAreaPath = pointsNet.length > 0
    ? `${netPath} L ${pointsNet[pointsNet.length - 1].x} ${paddingTop + plotHeight} L ${pointsNet[0].x} ${paddingTop + plotHeight} Z`
    : '';

  const hoveredItem = hoveredIndex !== null ? data[hoveredIndex] : null;
  const hoveredPointGross = hoveredIndex !== null ? pointsGross[hoveredIndex] : null;

  return (
    <div className="rounded-xl p-4 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Annual Payroll Trend &bull; {year} Full Year
            </h3>
            <p className="text-[11px] text-zinc-400">
              Monthly outflow progression across all 12 operating cycles
            </p>
          </div>
        </div>

        {/* View mode toggle pills */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('both')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
              viewMode === 'both'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Both
          </button>
          <button
            type="button"
            onClick={() => setViewMode('gross-only')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
              viewMode === 'gross-only'
                ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Gross Only
          </button>
          <button
            type="button"
            onClick={() => setViewMode('net-only')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
              viewMode === 'net-only'
                ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Net Only
          </button>
        </div>
      </div>

      {/* SVG Chart Canvas */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible"
        >
          <defs>
            {/* Subtle Gradient for Gross */}
            <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>

            {/* Subtle Gradient for Net */}
            <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {yTicks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={t.y}
                x2={svgWidth - paddingRight}
                y2={t.y}
                stroke="currentColor"
                strokeDasharray="4 4"
                className="text-zinc-200 dark:text-zinc-800"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 10}
                y={t.y + 4}
                textAnchor="end"
                className="fill-zinc-400 dark:fill-zinc-500 font-mono text-[10px]"
              >
                {formatCompactNaira(t.value)}
              </text>
            </g>
          ))}

          {/* X Axis Baseline */}
          <line
            x1={paddingLeft}
            y1={paddingTop + plotHeight}
            x2={svgWidth - paddingRight}
            y2={paddingTop + plotHeight}
            stroke="currentColor"
            className="text-zinc-200 dark:text-zinc-800"
            strokeWidth="1.5"
          />

          {/* X Axis Month Labels */}
          {data.map((item, idx) => {
            const x = paddingLeft + (idx / Math.max(data.length - 1, 1)) * plotWidth;
            return (
              <text
                key={item.key}
                x={x}
                y={svgHeight - 12}
                textAnchor="middle"
                className={`text-[10px] font-mono transition-colors ${
                  hoveredIndex === idx
                    ? 'fill-zinc-900 dark:fill-zinc-100 font-semibold'
                    : 'fill-zinc-400 dark:fill-zinc-500'
                }`}
              >
                {item.shortLabel}
              </text>
            );
          })}

          {/* Gross Gradient Area Fill */}
          {(viewMode === 'both' || viewMode === 'gross-only') && grossAreaPath && (
            <path d={grossAreaPath} fill="url(#grossGradient)" />
          )}

          {/* Net Gradient Area Fill */}
          {(viewMode === 'both' || viewMode === 'net-only') && netAreaPath && (
            <path d={netAreaPath} fill="url(#netGradient)" />
          )}

          {/* Gross Spline Curve */}
          {(viewMode === 'both' || viewMode === 'gross-only') && (
            <path
              d={grossPath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* Net Spline Curve */}
          {(viewMode === 'both' || viewMode === 'net-only') && (
            <path
              d={netPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* Data Points on Gross Line */}
          {(viewMode === 'both' || viewMode === 'gross-only') &&
            pointsGross.map(p => (
              <circle
                key={`gross-${p.idx}`}
                cx={p.x}
                cy={p.y}
                r={hoveredIndex === p.idx ? '5' : '3.5'}
                fill="#3b82f6"
                stroke="white"
                strokeWidth="1.5"
                className="transition-all duration-150 cursor-pointer"
              />
            ))}

          {/* Data Points on Net Line */}
          {(viewMode === 'both' || viewMode === 'net-only') &&
            pointsNet.map(p => (
              <circle
                key={`net-${p.idx}`}
                cx={p.x}
                cy={p.y}
                r={hoveredIndex === p.idx ? '5' : '3.5'}
                fill="#10b981"
                stroke="white"
                strokeWidth="1.5"
                className="transition-all duration-150 cursor-pointer"
              />
            ))}

          {/* Vertical Crosshair Line when Hovered */}
          {hoveredPointGross && (
            <line
              x1={hoveredPointGross.x}
              y1={paddingTop}
              x2={hoveredPointGross.x}
              y2={paddingTop + plotHeight}
              stroke="currentColor"
              strokeDasharray="3 3"
              className="text-zinc-400 dark:text-zinc-500"
              strokeWidth="1"
            />
          )}

          {/* Invisible Overlay Bars for Mouse Hover Detection */}
          {data.map((_, idx) => {
            const colWidth = plotWidth / Math.max(data.length - 1, 1);
            const x = paddingLeft + (idx / Math.max(data.length - 1, 1)) * plotWidth - colWidth / 2;
            return (
              <rect
                key={idx}
                x={Math.max(x, paddingLeft - colWidth / 2)}
                y={paddingTop}
                width={colWidth}
                height={plotHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredItem && hoveredPointGross && (
          <div
            className="absolute z-30 pointer-events-none transition-all duration-100 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-700/80 rounded-lg shadow-xl p-3 text-xs w-56 text-left"
            style={{
              left: `${Math.min(Math.max(hoveredPointGross.x - 110, 10), svgWidth - 240)}px`,
              top: '15px',
            }}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1.5 mb-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-zinc-400" />
                {hoveredItem.label} {year}
              </span>
              <span className="font-mono text-[10px] text-zinc-400">
                {hoveredItem.headcount} staff
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px]">
              {(viewMode === 'both' || viewMode === 'gross-only') && (
                <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                  <span className="font-sans font-medium text-zinc-500">Gross:</span>
                  <span className="font-semibold">{formatNaira(hoveredItem.gross)}</span>
                </div>
              )}

              {(viewMode === 'both' || viewMode === 'net-only') && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <span className="font-sans font-medium text-zinc-500">Net:</span>
                  <span className="font-semibold">{formatNaira(hoveredItem.net)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-zinc-500 text-[10px] pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                <span className="font-sans">PAYE:</span>
                <span>{formatNaira(hoveredItem.paye)}</span>
              </div>

              <div className="flex items-center justify-between text-zinc-500 text-[10px]">
                <span className="font-sans">Pension:</span>
                <span>{formatNaira(hoveredItem.pension)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex items-center justify-center gap-6 pt-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-zinc-600 dark:text-zinc-400">Total Gross Payroll</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-zinc-600 dark:text-zinc-400">Net Take-Home Pay</span>
        </div>
      </div>
    </div>
  );
};
