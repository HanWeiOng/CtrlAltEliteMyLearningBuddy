"use client"

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';

// Define component props
interface ConceptMasteryChartProps {
  quizId?: string;
  teacherId?: number;
}

export function ConceptMasteryChart({ quizId = 'all', teacherId }: ConceptMasteryChartProps) {
  // Track hovered bar
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  
  // Sample data for the concept mastery
  const concepts = [
    { name: 'Algebra', mastery: 65 },
    { name: 'Geometry', mastery: 19 },
    { name: 'Functions', mastery: 58 },
    { name: 'Statistics', mastery: 82 },
    { name: 'Calculus', mastery: 45 },
    { name: 'Probability', mastery: 65 },
    { name: 'Trigonometry', mastery: 52 }
  ];

  // In a real app, we would filter or fetch data based on quizId and teacherId
  // For now, we'll just log it for demonstration
  console.log(`Rendering ConceptMasteryChart with quizId: ${quizId}, teacherId: ${teacherId}`);

  // Function to determine color based on mastery level
  const getBarColor = (mastery: number) => {
    if (mastery >= 80) return '#10b981'; // emerald-500
    if (mastery >= 70) return '#6366f1'; // indigo-500
    if (mastery >= 60) return '#8b5cf6'; // violet-500
    if (mastery >= 50) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };
  
  // Function to determine status based on mastery level
  const getStatus = (mastery: number) => {
    if (mastery >= 80) return 'Excellent';
    if (mastery >= 70) return 'Good';
    if (mastery >= 60) return 'Good';
    if (mastery >= 50) return 'Average';
    return 'Needs Improvement';
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const { name, mastery } = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-3 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center mb-1.5">
            <span className="rounded-full w-3 h-3 bg-indigo-500 mr-2"></span>
            <span className="font-semibold text-[0.8125rem]">Concept</span>
            <span className="ml-auto text-[0.8125rem]">{name}</span>
          </div>
          <div className="flex items-center mb-1.5">
            <span className="rounded-full w-3 h-3 bg-indigo-500 mr-2"></span>
            <span className="font-semibold text-[0.8125rem]">Mastery</span>
            <span className="ml-auto text-[0.8125rem] font-medium">{mastery}%</span>
          </div>
          <div className="flex items-center">
            <span className="rounded-full w-3 h-3 bg-indigo-500 mr-2"></span>
            <span className="font-semibold text-[0.8125rem]">Status</span>
            <span className="ml-auto text-[0.8125rem]">{getStatus(mastery)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom axis tick for X axis (rotated)
  const CustomAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} 
          y={0} 
          dy={12} 
          textAnchor="end" 
          fill="#64748b" 
          fontSize="11"
          transform="rotate(-35)"
        >
          {payload.value}
        </text>
      </g>
    );
  };

  // Styling constants shared with class average chart
  const chartHeight = 300; // Same height for both charts
  const chartPadding = 4;
  const axisWidth = 40;
  const yAxisTicks = [0, 20, 40, 60, 80, 100];

  return (
    <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-lg">
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={concepts}
            margin={{ top: 5, right: 40, left: 0, bottom: 30 }}
            barGap={0}
            barCategoryGap={0}
          >
            <CartesianGrid 
              stroke="#e2e8f0" 
              strokeDasharray="0" 
              horizontal={true} 
              vertical={false} 
              opacity={0.4}
            />
            
            <XAxis 
              dataKey="name" 
              axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
              tickLine={false} 
              tick={CustomAxisTick}
              height={40}
              interval={0}
              tickMargin={20}
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
              cursor={{ fill: 'transparent' }}
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
            
            <Bar 
              dataKey="mastery" 
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              animationDuration={1000}
            >
              {concepts.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={getBarColor(entry.mastery)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 