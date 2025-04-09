"use client"

import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

// Define the quiz folder data type
interface QuizFolderData {
  subject: string;
  banding: string;
  level: string;
}

// Define the quiz score type
interface QuizScore {
  paper_id: string;
  total_number_of_completed: number;
  average_student_score: string;
}

// Define the quiz name type
interface QuizName {
  id: string;
  name: string;
}

const BASE_URL = 'http://localhost:5003';

export function ClassAverageChart({ quizId = 'all', teacherId }: ClassAverageChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizNames, setQuizNames] = useState<Record<string, string>>({});

  // Debug log for props
  useEffect(() => {
    console.log('ClassAverageChart props:', { quizId, teacherId });
  }, [quizId, teacherId]);

  // Fetch quiz names
  useEffect(() => {
    const fetchQuizNames = async () => {
      if (!teacherId) return;

      try {
        const response = await axios.get(`${BASE_URL}/api/visualisationGraph/getAllQuizzes`, {
          params: { teacher_id: teacherId }
        });

        const namesMap: Record<string, string> = {};
        response.data.forEach((quiz: QuizName) => {
          namesMap[quiz.id] = quiz.name;
        });
        setQuizNames(namesMap);
      } catch (err) {
        console.error('Error fetching quiz names:', err);
      }
    };

    fetchQuizNames();
  }, [teacherId]);

  // Fetch quiz folder data and scores
  useEffect(() => {
    const fetchData = async () => {
      if (!teacherId) {
        console.log('Missing teacher ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('Fetching data for quiz:', quizId);

        let scoresResponse;
        
        if (quizId === 'all') {
          // Get all quiz scores
          scoresResponse = await axios.post(`${BASE_URL}/api/visualisationGraph/getAllAverageQuizScores`, {
            teacher_id: teacherId,
            subject: "Biology",  // You might want to make these configurable
            banding: "Combined",
            level: "O Level"
          });

          console.log('All quiz scores response:', scoresResponse.data);

          if (!scoresResponse.data.scores || !Array.isArray(scoresResponse.data.scores)) {
            setData([]);
            return;
          }
        } else {
          // Get specific quiz scores
          // First get the quiz folder data
          const folderResponse = await axios.get(`${BASE_URL}/api/visualisationGraph/getQuizFolder`, {
            params: {
              quiz_id: parseInt(quizId),
              teacher_id: teacherId
            }
          });

          if (!folderResponse.data) {
            throw new Error('No quiz folder data received');
          }

          console.log('Quiz folder data:', folderResponse.data);
          const { subject, banding, level } = folderResponse.data;

          if (!subject || !banding || !level) {
            throw new Error('Quiz folder data is missing required fields');
          }

          // Then get the quiz scores
          scoresResponse = await axios.post(`${BASE_URL}/api/visualisationGraph/getAverageQuizScoresFor3Quiz`, {
            paper_id: parseInt(quizId),
            teacher_id: teacherId,
            subject,
            banding,
            level
          });

          console.log('Quiz scores response:', scoresResponse.data);

          if (!scoresResponse.data.scores || !Array.isArray(scoresResponse.data.scores)) {
            setData([]);
            return;
          }
        }

        // Transform the data for the chart
        const transformedData = scoresResponse.data.scores.map((score: QuizScore, index: number) => {
          const prevScore = index > 0 
            ? parseFloat(scoresResponse.data.scores[index - 1].average_student_score) 
            : null;
          const currentScore = parseFloat(score.average_student_score);
          const change = prevScore !== null ? (currentScore - prevScore) : null;

          return {
            quiz: quizNames[score.paper_id] || `Quiz ${score.paper_id}`,
            score: currentScore,
            change: change,
            total_completed: score.total_number_of_completed
          };
        });

        console.log('Transformed data:', transformedData);
        setData(transformedData);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load chart data');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [quizId, teacherId, quizNames]);

  // Loading state
  if (loading) {
    return (
      <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-lg h-[300px] flex items-center justify-center">
        <div className="text-slate-500">Loading chart data...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-lg h-[300px] flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  // No data state
  if (data.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-lg h-[300px] flex items-center justify-center">
        <div className="text-slate-500">No data available</div>
      </div>
    );
  }

  // Format the data for display in tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const { score, change, total_completed } = payload[0].payload;
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
            <span className="ml-auto text-[0.8125rem] font-medium">{score.toFixed(1)}%</span>
          </div>
          <div className="flex items-center mb-1.5">
            <span className="rounded-full w-3 h-3 bg-indigo-500 mr-2"></span>
            <span className="font-semibold text-[0.8125rem]">Completed</span>
            <span className="ml-auto text-[0.8125rem] font-medium">{total_completed} students</span>
          </div>
          {change !== null && (
            <div className="flex items-center">
              <span className="rounded-full w-3 h-3 bg-indigo-500 mr-2"></span>
              <span className="font-semibold text-[0.8125rem]">Change</span>
              <span 
                className={`ml-auto ${change > 0 ? 'text-emerald-500' : 'text-red-500'} text-[0.8125rem]`}
              >
                {change > 0 ? '+' : ''}{change.toFixed(1)}% from previous
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom axis tick style
  const chartHeight = 300; // Same height for both charts
  const chartPadding = 4;
  const axisWidth = 40;
  const yAxisTicks = [0, 20, 40, 60, 80, 100];

  return (
    <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-lg overflow-hidden">
      <div className="h-[300px] w-full overflow-x-auto">
        <div className={`h-full ${data.length > 5 ? 'min-w-[800px]' : 'w-full'}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 40, left: 40, bottom: 50 }}
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
                dy={16}
                height={40}
                interval={0}
                angle={-45}
                textAnchor="end"
                padding={{ left: 30, right: 30 }}
              />
              
              <YAxis 
                domain={[0, 100]} 
                ticks={[0, 20, 40, 60, 80, 100]}
                axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                tickLine={false}
                tickFormatter={(value) => `${value}`}
                tick={{ fontSize: 12, fill: '#64748b' }}
                width={40}
                padding={{ top: 5, bottom: 0 }}
              />
              
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={false}
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
    </div>
  );
}

// Update CustomAxisTick component
const CustomAxisTick = (props: any) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text 
        dy={0}
        textAnchor="end" 
        fill="#64748b" 
        fontSize="0.75rem"
        className="font-medium"
        transform="rotate(-45)"
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