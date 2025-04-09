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
        <div className="text-red-500">Error: {error}</div>
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
    if (numScore >= 85) return 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400';
    if (numScore >= 70) return 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400';
    return 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400';
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
<div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
  <div className="overflow-x-auto">
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-slate-50 dark:bg-slate-800/50">
          <th className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
            #
          </th>
          <th className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
            Student
          </th>
          <th
            className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 cursor-pointer group"
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
            className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
              {index + 1}
            </td>
            <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-2">
                <span>{student.student_name}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-right">
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(
                  student.student_score
                )}`}
              >
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