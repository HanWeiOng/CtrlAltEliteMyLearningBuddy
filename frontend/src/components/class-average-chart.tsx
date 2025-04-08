"use client"

import React, { useState, useEffect } from 'react';
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
import axios from 'axios';

// Define the component props
interface ClassAverageChartProps {
  quizId?: string;
  teacherId?: number;
}

// Define the backend response type
interface QuizScore {
  paper_id: string;
  total_number_of_completed: number;
  average_student_score: string;
}

// Define the quiz folder data type
interface QuizFolderData {
  subject: string;
  banding: string;
  level: string;
}

// Define the quiz folder name type
interface QuizFolderName {
  id: string;
  folder_name: string;
}

// Add BASE_URL constant
const BASE_URL = 'http://localhost:5003';

export function ClassAverageChart({ 
  quizId = 'all', 
  teacherId
}: ClassAverageChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizFolderNames, setQuizFolderNames] = useState<Record<string, string>>({});

  // Debug log for props
  useEffect(() => {
    console.log('ClassAverageChart props:', { quizId, teacherId });
  }, [quizId, teacherId]);

  // Fetch quiz names and data
  useEffect(() => {
    const fetchData = async () => {
      if (!teacherId) return;

      try {
        setLoading(true);
        console.log('Fetching quiz data...');

        // First get all quizzes to get the names
        const quizzesResponse = await axios.get(`${BASE_URL}/api/visualisationGraph/getAllQuizzes`, {
          params: { teacher_id: teacherId }
        });

        console.log('All quizzes response:', quizzesResponse.data);

        // Create quiz names map
        const namesMap: Record<string, string> = {};
        quizzesResponse.data.forEach((quiz: any) => {
          if (quiz.id !== 'all') {
            namesMap[quiz.id] = quiz.name;
          }
        });
        setQuizFolderNames(namesMap);

        // If quizId is 'all', we'll fetch data for all quizzes
        if (quizId === 'all') {
          // Get the first quiz's folder data to get subject, banding, level
          const firstQuiz = quizzesResponse.data.find((quiz: any) => quiz.id !== 'all');
          if (!firstQuiz) {
            setData([]);
            return;
          }

          const folderResponse = await axios.get(`${BASE_URL}/api/visualisationGraph/getQuizFolderData`, {
            params: {
              quiz_id: firstQuiz.id,
              teacher_id: teacherId
            }
          });

          console.log('Quiz folder data response:', folderResponse.data);

          // Now fetch scores for all quizzes using the folder data
          const scoresResponse = await axios.post(`${BASE_URL}/api/visualisationGraph/getAverageQuizScoresFor3Quiz`, {
            paper_id: firstQuiz.id,
            teacher_id: teacherId,
            subject: folderResponse.data.subject,
            banding: folderResponse.data.banding,
            level: folderResponse.data.level
          });

          console.log('Quiz scores response:', scoresResponse.data);

          if (!scoresResponse.data.scores || scoresResponse.data.scores.length === 0) {
            setData([]);
            return;
          }

          // Transform the data
          const transformedData = scoresResponse.data.scores.map((score: any, index: number) => {
            const prevScore = index > 0 ? parseFloat(scoresResponse.data.scores[index - 1].average_student_score) : null;
            const currentScore = parseFloat(score.average_student_score);
            const change = prevScore !== null ? currentScore - prevScore : null;

            return {
              quiz: namesMap[score.paper_id] || `Quiz ${score.paper_id}`,
              score: currentScore,
              change: change,
              paper_id: score.paper_id,
              total_completed: score.total_number_of_completed
            };
          });

          console.log('Transformed data:', transformedData);
          setData(transformedData);
        } else {
          // Handle specific quiz case
          const folderResponse = await axios.get(`${BASE_URL}/api/visualisationGraph/getQuizFolderData`, {
            params: {
              quiz_id: quizId,
              teacher_id: teacherId
            }
          });

          const scoresResponse = await axios.post(`${BASE_URL}/api/visualisationGraph/getAverageQuizScoresFor3Quiz`, {
            paper_id: quizId,
            teacher_id: teacherId,
            subject: folderResponse.data.subject,
            banding: folderResponse.data.banding,
            level: folderResponse.data.level
          });

          if (!scoresResponse.data.scores || scoresResponse.data.scores.length === 0) {
            setData([]);
            return;
          }

          const transformedData = scoresResponse.data.scores.map((score: any, index: number) => {
            const prevScore = index > 0 ? parseFloat(scoresResponse.data.scores[index - 1].average_student_score) : null;
            const currentScore = parseFloat(score.average_student_score);
            const change = prevScore !== null ? currentScore - prevScore : null;

            return {
              quiz: namesMap[score.paper_id] || `Quiz ${score.paper_id}`,
              score: currentScore,
              change: change,
              paper_id: score.paper_id,
              total_completed: score.total_number_of_completed
            };
          });

          setData(transformedData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load quiz data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    fetchQuizzes();
  }, [quizId, teacherId]);

  // Then fetch quiz folder data once we have a selected quiz ID
  useEffect(() => {
    const fetchQuizFolderData = async () => {
      if (!teacherId || !selectedQuizId) return;

      try {
        console.log('Fetching quiz folder data for:', selectedQuizId);
        const response = await axios.get(`${BASE_URL}/api/visualisationGraph/getQuizFolderData`, {
          params: {
            quiz_id: selectedQuizId,
            teacher_id: teacherId
          }
        });

        console.log('Quiz folder data response:', response.data);
        setQuizFolderData(response.data);
      } catch (err) {
        console.error('Error fetching quiz folder data:', err);
        setError('Failed to load quiz folder data');
      }
    };

    fetchQuizFolderData();
  }, [selectedQuizId, teacherId]);

  // Finally fetch the quiz scores once we have all required data
  useEffect(() => {
    const fetchQuizScores = async () => {
      if (!teacherId || !selectedQuizId || !quizFolderData) {
        console.log('Missing required data:', { teacherId, selectedQuizId, quizFolderData });
        return;
      }

      try {
        setLoading(true);
        console.log('Fetching quiz scores with:', {
          paper_id: selectedQuizId,
          teacher_id: teacherId,
          ...quizFolderData
        });

        const response = await axios.post(`${BASE_URL}/api/visualisationGraph/getAverageQuizScoresFor3Quiz`, {
          paper_id: selectedQuizId,
          teacher_id: teacherId,
          subject: quizFolderData.subject,
          banding: quizFolderData.banding,
          level: quizFolderData.level
        });

        console.log('Quiz scores response:', response.data);

        if (!response.data.scores || response.data.scores.length === 0) {
          setData([]);
          return;
        }

        // Sort scores based on selected_papers order
        const sortedScores = [...response.data.scores].sort((a, b) => {
          const indexA = response.data.selected_papers.indexOf(a.paper_id);
          const indexB = response.data.selected_papers.indexOf(b.paper_id);
          return indexA - indexB;
        });

        const transformedData = sortedScores.map((score, index) => {
          const prevScore = index > 0 ? parseFloat(sortedScores[index - 1].average_student_score) : null;
          const currentScore = parseFloat(score.average_student_score);
          const change = prevScore !== null ? currentScore - prevScore : null;

          return {
            quiz: quizFolderNames[score.paper_id] || `Quiz ${score.paper_id}`,
            score: currentScore,
            change: change,
            paper_id: score.paper_id,
            total_completed: score.total_number_of_completed
          };
        });

        console.log('Transformed data:', transformedData);
        setData(transformedData);
      } catch (err) {
        console.error('Error fetching quiz scores:', err);
        setError('Failed to load quiz scores');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizScores();
  }, [selectedQuizId, teacherId, quizFolderData, quizFolderNames]);

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
                {change > 0 ? "+" : ""}{change.toFixed(1)}%
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

  if (loading) {
    return (
      <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-lg h-[300px] flex items-center justify-center">
        <div className="text-slate-500">Loading chart data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-lg h-[300px] flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-lg h-[300px] flex items-center justify-center">
        <div className="text-slate-500">No data available</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-lg">
      <div key={JSON.stringify(data)} className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-semibold text-indigo-600 flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            Class Average
          </h3>
          <p className="text-sm text-slate-500">Performance trends across quizzes</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
          </svg>
          Trending Up
        </div>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%" key={JSON.stringify(data)}>
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 10, bottom: 30 }}
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
              ticks={[0, 20, 40, 60, 80, 100]}
              axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
              tickLine={false}
              tickFormatter={(value) => `${value}`}
              tick={{ fontSize: 12, fill: '#64748b' }}
              width={40}
              padding={{ top: 20, bottom: 0 }}
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
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 