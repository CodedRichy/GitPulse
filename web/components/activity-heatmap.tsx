'use client';

interface HeatmapData {
  date: string;
  count: number;
  intensity: number; // 0-4
}

interface ActivityHeatmapProps {
  data: HeatmapData[];
  days?: number;
}

export function ActivityHeatmap({ data, days = 90 }: ActivityHeatmapProps) {
  // Sort by date
  const sortedData = [...data].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Group by weeks for display
  const weeks: HeatmapData[][] = [];
  let currentWeek: HeatmapData[] = [];

  for (const day of sortedData) {
    const date = new Date(day.date);
    const dayOfWeek = date.getDay(); // 0 = Sunday

    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Color mapping for intensity
  const intensityColors = [
    'bg-stone-800/30',     // 0 - no activity
    'bg-emerald-500/20',   // 1 - low
    'bg-emerald-500/40',   // 2 - medium
    'bg-emerald-500/60',   // 3 - high
    'bg-emerald-500/80',   // 4 - very high
  ];

  // Get month labels
  const months: string[] = [];
  let lastMonth = '';
  for (const week of weeks) {
    for (const day of week) {
      const month = new Date(day.date).toLocaleDateString('en-US', { month: 'short' });
      if (month !== lastMonth && !months.includes(month)) {
        months.push(month);
        lastMonth = month;
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Month labels */}
      <div className="flex text-xs text-stone-500 uppercase tracking-wider">
        {months.map((month, i) => (
          <div key={i} className="flex-1 text-center">
            {month}
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="flex gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={`
                  w-3 h-3 rounded-sm ${intensityColors[day.intensity]}
                  hover:ring-2 hover:ring-emerald-500/50 transition-all cursor-pointer
                `}
                title={`${day.date}: ${day.count} commits`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 text-xs text-stone-500">
        <span>Less</span>
        {intensityColors.map((color, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

interface StatsCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export function StatsCard({ label, value, subtext, trend, trendValue }: StatsCardProps) {
  const trendColors = {
    up: 'text-emerald-500',
    down: 'text-red-500',
    neutral: 'text-stone-500',
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border-stone-800">
      <p className="text-xs text-stone-500 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {subtext && (
        <p className="text-sm text-stone-400 mt-1">{subtext}</p>
      )}
      {trend && trendValue && (
        <div className={`flex items-center gap-1 mt-2 text-sm ${trendColors[trend]}`}>
          {trend === 'up' && '↑'}
          {trend === 'down' && '↓'}
          {trend === 'neutral' && '→'}
          {trendValue}
        </div>
      )}
    </div>
  );
}
