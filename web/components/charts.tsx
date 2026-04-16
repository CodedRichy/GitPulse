'use client';

interface ChartProps {
  data: number[];
  labels: string[];
  height?: number;
  color?: string;
}

export function AreaChart({ data, labels, height = 200, color = '#22D3EE' }: ChartProps) {
  const max = Math.max(...data, 100);
  const min = Math.min(...data, 0);
  const range = max - min;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <div style={{ height }} className="w-full relative group">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="currentColor"
            strokeWidth="0.1"
            className="text-stone-800"
          />
        ))}
        
        {/* Area fill */}
        <polygon
          points={areaPoints}
          fill={color}
          fillOpacity="0.05"
          className="transition-all duration-500"
        />
        
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-500 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]"
        />
        
        {/* Points */}
        {data.map((val, i) => (
          <circle
            key={i}
            cx={(i / (data.length - 1)) * 100}
            cy={100 - ((val - min) / range) * 100}
            r="1"
            fill="white"
            stroke={color}
            strokeWidth="0.5"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
        ))}
      </svg>
      
      {/* Tooltip-like labels (simplified) */}
      <div className="flex justify-between mt-4">
        {labels.map((label, i) => (
          <span key={i} className="text-[9px] text-stone-600 font-mono uppercase tracking-widest">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function BarChart({ data, labels, color = '#FBBF24' }: ChartProps) {
  const max = Math.max(...data, 1);
  
  return (
    <div className="flex items-end gap-2 h-40 w-full pt-4">
      {data.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
          <div className="w-full relative">
            <div 
              className="w-full rounded-t-[2px] transition-all duration-500 group-hover:opacity-80 shadow-[0_0_10px_rgba(251,191,36,0.2)]"
              style={{ 
                height: `${(val / max) * 100}%`,
                backgroundColor: color 
              }}
            />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono whitespace-nowrap bg-stone-800 text-white px-1.5 py-0.5 rounded border border-stone-700">
              {val}
            </div>
          </div>
          <span className="text-[9px] text-stone-600 font-mono truncate w-full text-center uppercase tracking-widest">
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}
