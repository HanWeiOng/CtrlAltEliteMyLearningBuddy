"use client"

import React, { useState, useEffect } from 'react';
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

// Define topic data structure
type Topic = {
  name: string;
  mastery: number;
  wrong_ratio: number;
}

// Define component props
interface ConceptMasteryChartProps {
  quizId?: string;
  teacherId?: number;
}

export function ConceptMasteryChart({ quizId = 'all', teacherId }: ConceptMasteryChartProps) {
  // Track hovered bar
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  
  // State for topics data
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch topic data from API
  useEffect(() => {
    const fetchTopicsData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('http://localhost:5003/api/visualisationGraph/getHardestTopic');
        
        if (!response.ok) {
          throw new Error('Failed to fetch topic data');
        }
        
        const data = await response.json();
        
        // Transform the data - convert wrong_ratio to mastery score (100 - wrong_ratio*100)
        const transformedData = data.map((topic: any) => ({
          name: topic.topic_label,
          wrong_ratio: parseFloat(topic.wrong_ratio),
          // Lower wrong ratio means higher mastery
          mastery: Math.round(100 - parseFloat(topic.wrong_ratio) * 100)
        }));
        
        setTopics(transformedData);
      } catch (err) {
        console.error('Error fetching topic data:', err);
        setError('Failed to load topic data');
        
        // Fallback to sample data
        setTopics([
          { name: 'Algebra', mastery: 65, wrong_ratio: 0.35 },
          { name: 'Geometry', mastery: 19, wrong_ratio: 0.81 },
          { name: 'Functions', mastery: 58, wrong_ratio: 0.42 },
          { name: 'Statistics', mastery: 82, wrong_ratio: 0.18 },
          { name: 'Calculus', mastery: 45, wrong_ratio: 0.55 },
          { name: 'Probability', mastery: 65, wrong_ratio: 0.35 },
          { name: 'Trigonometry', mastery: 52, wrong_ratio: 0.48 }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTopicsData();
  }, [quizId, teacherId]);

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
      const { name, mastery, wrong_ratio } = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-3 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center mb-1.5">
            <span className="rounded-full w-3 h-3 bg-indigo-500 mr-2"></span>
            <span className="font-semibold text-[0.8125rem]">Topic</span>
            <span className="ml-auto text-[0.8125rem]">{name}</span>
          </div>
          <div className="flex items-center mb-1.5">
            <span className="rounded-full w-3 h-3 bg-indigo-500 mr-2"></span>
            <span className="font-semibold text-[0.8125rem]">Mastery</span>
            <span className="ml-auto text-[0.8125rem] font-medium">{mastery}%</span>
          </div>
          <div className="flex items-center mb-1.5">
            <span className="rounded-full w-3 h-3 bg-red-500 mr-2"></span>
            <span className="font-semibold text-[0.8125rem]">Error Rate</span>
            <span className="ml-auto text-[0.8125rem] font-medium">{(wrong_ratio * 100).toFixed(1)}%</span>
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

  // Styling constants
  const chartHeight = 300;
  const axisWidth = 40;
  const yAxisTicks = [0, 20, 40, 60, 80, 100];

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-lg">
        <div className="h-[300px] w-full flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            <p className="mt-2 text-sm text-slate-500">Loading topic data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-lg">
        <div className="h-[300px] w-full flex items-center justify-center">
          <div className="flex flex-col items-center">
            <p className="text-red-500">❌ {error}</p>
            <p className="mt-1 text-sm text-slate-500">Please try again later</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-800 p-4 pb-2 rounded-lg">
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={topics}
            margin={{ top: 2, right: 40, left: 0, bottom: 30 }}
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
              {topics.map((entry, index) => (
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