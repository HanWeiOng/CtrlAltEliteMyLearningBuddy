"use client"

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronUp, ChevronDown, Minus } from 'lucide-react';

interface StudentPerformanceProps {
  folderId?: string;
  onStudentCountChange?: (count: number) => void;
}

interface StudentScore {
  student_name: string;
  student_score: string;
  trend?: 'up' | 'down' | 'same';
}

type SortDirection = 'asc' | 'desc';

const BASE_URL = 'http://localhost:5003';

export function StudentPerformanceTable({ folderId, onStudentCountChange }: StudentPerformanceProps) {
  const [students, setStudents] = useState<StudentScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Add useEffect to notify parent of student count changes
  useEffect(() => {
    onStudentCountChange?.(students.length);
  }, [students.length, onStudentCountChange]);

  const sortStudents = (students: StudentScore[], direction: SortDirection) => {
    return [...students].sort((a, b) => {
      const scoreA = parseFloat(a.student_score);
      const scoreB = parseFloat(b.student_score);
      return direction === 'desc' ? scoreB - scoreA : scoreA - scoreB;
    });
  };

  const toggleSort = () => {
    const newDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    setSortDirection(newDirection);
    setStudents(prev => sortStudents(prev, newDirection));
  };

  useEffect(() => {
    const fetchStudentScores = async () => {
      if (!folderId) {
        setLoading(false);
        setStudents([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching student scores for folder: ${folderId}`);
        const response = await axios.post(`${BASE_URL}/api/visualisationGraph/getIndividualPaperAllScore/${folderId}`);
        
        if (!response.data || !Array.isArray(response.data)) {
          console.error('Invalid response format:', response.data);
          setStudents([]);
          return;
        }

        // Sort students by score in descending order by default
        const sortedStudents = sortStudents(
          response.data.map(student => ({
            ...student,
            trend: 'same' as const
          })),
          sortDirection
        );

        console.log(`Found ${sortedStudents.length} student scores`);
        setStudents(sortedStudents);
      } catch (err: any) {
        console.error('Error fetching student scores:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load student scores');
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentScores();
  }, [folderId, sortDirection]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-slate-500">Loading student scores...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  // No data state
  if (!students.length) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-slate-500">
          {!folderId ? 'Please select a quiz to view student scores' : 'No student scores available'}
        </div>
      </div>
    );
  }

  const getScoreColor = (score: string) => {
    const numScore = parseFloat(score);
    if (numScore >= 85) return 'bg-green-100 text-green-800';  // High score = green
    if (numScore >= 70) return 'bg-blue-100 text-blue-800';    // Medium score = blue
    return 'bg-red-100 text-red-800';                          // Low score = red
  };

  const getTrendIcon = (trend: StudentScore['trend']) => {
    switch (trend) {
      case 'up':
        return <ChevronUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <ChevronDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getSortIcon = () => {
    return sortDirection === 'desc' ? 
      <ChevronDown className="w-4 h-4 inline-block ml-1" /> : 
      <ChevronUp className="w-4 h-4 inline-block ml-1" />;
  };

  return (
    <div className="rounded-xl bg-white">
      <div className="h-[400px] overflow-auto">
        <table className="min-w-full">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-slate-100">
              <th className="text-left py-4 px-6 text-sm font-medium text-slate-600">#</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-slate-600">Student</th>
              <th 
                className="text-right py-4 px-6 text-sm font-medium text-slate-600 cursor-pointer group"
                onClick={toggleSort}
              >
                <div className="flex items-center justify-end gap-2">
                  {folderId === 'all' ? 'Average Score' : 'Score'}
                  <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    {getSortIcon()}
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => (
              <tr 
                key={student.student_name}
                className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
              >
                <td className="py-4 px-6 text-sm text-slate-600">{index + 1}</td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-900">
                      {student.student_name}
                    </span>
                    <div className="text-slate-400">
                      {getTrendIcon(student.trend)}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getScoreColor(student.student_score)}`}>
                    {parseFloat(student.student_score).toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 