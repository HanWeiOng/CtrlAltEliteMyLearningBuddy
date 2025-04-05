"use client"

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area
} from 'recharts';

// Define the component props
interface ClassAverageChartProps {
  quizId?: string;
  teacherId?: number;
}

export function ClassAverageChart({ quizId = 'all', teacherId }: ClassAverageChartProps) {
  // Track the hovered point
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  // Sample data for the chart
  const data = [
    { quiz: 'Quiz 1', score: 70, change: null },
    { quiz: 'Quiz 2', score: 68, change: -2 }, // decreased by 2%
    { quiz: 'Quiz 3', score: 76, change: 8 }   // increased by 8%
  ];

  // In a real app, we would filter or fetch data based on quizId and teacherId
  // For now, we'll just log it for demonstration
  console.log(`Rendering ClassAverageChart with quizId: ${quizId}, teacherId: ${teacherId}`);

  // Format the data for display in tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const { score, change } = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-3 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center mb-1.5">
            <span className="rounded-full w-3 h-3 bg-indigo-500 mr-2"></span>
            <span className="font-semibold text-[0.8125rem]">Quiz</span>
            <span className="ml-auto font-bold text-[0.8125rem]">{label}</span>
          </div>
          <div className="flex items-center mb-1.5">
            <span className="rounded-full w-3 h-3 bg-indigo-500 mr-2"></span>
            <span className="font-semibold text-[0.8125rem]">Average</span>
            <span className="ml-auto text-[0.8125rem] font-medium">{score}%</span>
          </div>
          {change !== null && (
            <div className="flex items-center">
              <span className="rounded-full w-3 h-3 bg-indigo-500 mr-2"></span>
              <span className="font-semibold text-[0.8125rem]">Change</span>
              <span 
                className={`ml-auto ${change > 0 ? 'text-emerald-500' : 'text-red-500'} text-[0.8125rem]`}
              >
                {change > 0 ? '+' : ''}{change}% from previous
              </span>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // Custom axis tick style
  const CustomAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          dy={16} 
          textAnchor="middle" 
          fill="#64748b" 
          fontSize="0.75rem"
          className="font-medium"
        >
          {payload.value}
        </text>
      </g>
    );
  };

  // Custom change label component
  const CustomChangeLabel = (props: any) => {
    const { points, range, value } = props;
    // Filter out points with no change
    const pointsWithChange = points.filter((point: any) => 
      point.payload.change !== null && point.payload.change !== undefined
    );

    return (
      <>
        {pointsWithChange.map((point: any, index: number) => {
          const { x, y } = point;
          const change = point.payload.change;
          const color = change > 0 ? "#10b981" : "#ef4444";

          return (
            <g key={index}>
              <text
                x={x}
                y={y + 25}
                textAnchor="middle"
                fill={color}
                fontWeight="500"
                fontSize="11"
                className="animate-fadeIn"
              >
                {change > 0 ? "+" : ""}{change}%
              </text>
              {change > 0 ? (
                <path
                  d={`M ${x - 5} ${y + 15} L ${x} ${y + 10} L ${x + 5} ${y + 15}`}
                  fill={color}
                  className="animate-fadeIn"
                />
              ) : (
                <path
                  d={`M ${x - 5} ${y + 10} L ${x} ${y + 15} L ${x + 5} ${y + 10}`}
                  fill={color}
                  className="animate-fadeIn"
                />
              )}
            </g>
          );
        })}
      </>
    );
  };

  // Styling constants shared with concept mastery chart
  const chartHeight = 300; // Same height for both charts
  const chartPadding = 4;
  const axisWidth = 40;
  const yAxisTicks = [0, 20, 40, 60, 80, 100];

  return (
    <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-lg">
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 40, left: 0, bottom: 30 }}
            barCategoryGap={10}
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              stroke="#e2e8f0" 
              strokeDasharray="0" 
              horizontal={true} 
              vertical={false} 
              opacity={0.4}
            />
            
            <XAxis 
              dataKey="quiz" 
              axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
              tickLine={false} 
              tick={CustomAxisTick}
              dy={10}
              height={40}
            />
            
            <YAxis 
              domain={[0, 100]} 
              ticks={yAxisTicks}
              axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
              tickLine={false}
              tickFormatter={(value) => `${value}`}
              tick={{ fontSize: 12, fill: '#64748b' }}
              width={axisWidth}
              padding={{ top: 5, bottom: 0 }}
              scale="linear"
              orientation="left"
            />
            
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={false}
              wrapperStyle={{ outline: 'none' }}
            />
            
            <ReferenceLine 
              y={70} 
              stroke="#94a3b8" 
              strokeDasharray="3 3" 
              strokeWidth={1.5}
              opacity={0.6}
              label={{
                value: 'Target',
                position: 'right',
                fill: '#64748b',
                fontSize: 12
              }}
            />
            
            <Area 
              type="monotone" 
              dataKey="score" 
              stroke="none" 
              fill="url(#areaGradient)" 
            />
            
            <Line 
              type="monotone" 
              dataKey="score" 
              stroke="#818cf8" 
              strokeWidth={3} 
              dot={{ fill: '#818cf8', r: 6, strokeWidth: 0 }}
              activeDot={{ fill: '#818cf8', r: 8, strokeWidth: 0 }}
              isAnimationActive={true}
              animationDuration={1000}
            />
            
            <CustomChangeLabel />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 