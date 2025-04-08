"use client"

import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

// Define topic data structure based on backend response
interface TopicData {
  topic_label: string;
  total_wrong_attempts: string;
  total_attempts_per_topic: string;
  selected_percentage_wrong: string;
}

interface ApiResponse {
  message: string;
  paper_id: string;
  data: TopicData[];
}

type Topic = {
  name: string;
  mastery: number;
  total_wrong_attempts: number;
  total_attempts: number;
  selected_percentage_wrong: number;
}

// Define component props
interface ConceptMasteryChartProps {
  quizId?: string;
  teacherId?: number;
}

const BASE_URL = 'http://localhost:5003';

// Create a custom axios instance
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  }
});

// Add request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    console.log('Making request:', {
      method: config.method,
      url: config.url,
      data: config.data
    });
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('Response received:', {
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    return Promise.reject(error);
  }
);

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
      if (!quizId || quizId === 'all') {
        console.log('No quiz selected or "all" selected, skipping fetch');
        setIsLoading(false);
        setTopics([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Fetching topic data for quiz:', quizId);
        
        const response = await axiosInstance.post('http://localhost:5003/api/visualisationGraph/getHardestTopicByPaper', {
          paper_id: quizId
        });
        
        if (!response.data || !Array.isArray(response.data.data)) {
          console.error('Invalid response format:', response.data);
          throw new Error('Invalid data format received from server');
        }
        
        if (response.data.data.length === 0) {
          console.log('No topic data available for this quiz');
          setTopics([]);
          return;
        }
        
        // Transform the data
        const transformedData = response.data.data
          .filter((topic: TopicData) => topic.topic_label && topic.selected_percentage_wrong)
          .map((topic: TopicData) => ({
            name: topic.topic_label,
            total_wrong_attempts: parseInt(topic.total_wrong_attempts),
            total_attempts: parseInt(topic.total_attempts_per_topic),
            selected_percentage_wrong: parseFloat(topic.selected_percentage_wrong),
            mastery: Math.round(100 - parseFloat(topic.selected_percentage_wrong))
          }))
          .sort((a: Topic, b: Topic) => b.mastery - a.mastery);
        
        console.log('Setting topics with data:', transformedData);
        setTopics(transformedData);
      } catch (err) {
        console.error('Error fetching topic data:', err);
        if (axios.isAxiosError(err)) {
          const errorMessage = err.response?.data?.message || 'Failed to load topic data';
          console.error('Server error details:', {
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data,
            config: err.config
          });
          setError(errorMessage);
        } else {
          setError('Failed to load topic data');
        }
        setTopics([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTopicsData();
  }, [quizId]);

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
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-3 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center mb-1.5">
            <span className="rounded-full w-3 h-3 bg-indigo-500 mr-2"></span>
            <span className="font-semibold text-[0.8125rem]">Topic</span>
            <span className="ml-auto text-[0.8125rem]">{data.name}</span>
          </div>
          <div className="flex items-center mb-1.5">
            <span className="rounded-full w-3 h-3 bg-indigo-500 mr-2"></span>
            <span className="font-semibold text-[0.8125rem]">Mastery</span>
            <span className="ml-auto text-[0.8125rem] font-medium">{data.mastery}%</span>
          </div>
          <div className="flex items-center mb-1.5">
            <span className="rounded-full w-3 h-3 bg-red-500 mr-2"></span>
            <span className="font-semibold text-[0.8125rem]">Error Rate</span>
            <span className="ml-auto text-[0.8125rem] font-medium">{data.selected_percentage_wrong.toFixed(1)}%</span>
          </div>
          <div className="flex items-center mb-1.5">
            <span className="rounded-full w-3 h-3 bg-blue-500 mr-2"></span>
            <span className="font-semibold text-[0.8125rem]">Wrong Attempts</span>
            <span className="ml-auto text-[0.8125rem] font-medium">{data.total_wrong_attempts} / {data.total_attempts}</span>
          </div>
          <div className="flex items-center">
            <span className="rounded-full w-3 h-3 bg-indigo-500 mr-2"></span>
            <span className="font-semibold text-[0.8125rem]">Status</span>
            <span className="ml-auto text-[0.8125rem]">{getStatus(data.mastery)}</span>
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

  // Show empty state when no quiz is selected or no data is available
  if (!isLoading && topics.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-lg">
        <div className="h-[300px] w-full flex items-center justify-center">
          <div className="flex flex-col items-center text-center">
            <p className="text-slate-500">
              {quizId === 'all' 
                ? 'Please select a specific quiz to view concept mastery data'
                : 'No concept mastery data available for this quiz'}
            </p>
          </div>
        </div>
      </div>
    );
  }

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