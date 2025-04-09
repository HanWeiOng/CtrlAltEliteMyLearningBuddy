'use client';

import { useEffect, useState } from 'react';
import { Flag } from 'lucide-react';

interface Student {
  student_name: string;
  score: number;
}

interface NeedsSupportProps {
  quizId: string;
}

const API_BASE_URL = 'http://localhost:5003/api';

export default function NeedsSupport({ quizId }: NeedsSupportProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        setError(null);

        const endpoint = quizId === 'all'
          ? `${API_BASE_URL}/visualisationGraph/getStudentsNeedingSupport`
          : `${API_BASE_URL}/visualisationGraph/getStudentsNeedingSupportByQuiz/${quizId}`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ teacher_id: 5 }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch student data: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        
        // Sort students by score (ascending) and take the lowest 5
        const sortedStudents = data.data
          .sort((a: Student, b: Student) => a.score - b.score)
          .slice(0, 5);

        setStudents(sortedStudents);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching students:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [quizId]);

  const getStatusInfo = (score: number) => {
    if (score < 60) {
      return {
        status: 'Critical',
        colorClasses: {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-700 dark:text-red-400',
        },
      };
    }
  
    return {
      status: 'At Risk',
      colorClasses: {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-400',
      },
    };
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-2">
      {students.map((student, index) => {
        const { status, colorClasses } = getStatusInfo(student.score);
        return (
          <div key={index} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full ${colorClasses.bg} ${colorClasses.text} font-medium text-xs`}>
                {index + 1}
              </div>
              <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                {student.student_name}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${colorClasses.bg} ${colorClasses.text}`}>
                {student.score}%
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${colorClasses.bg} ${colorClasses.text}`}>
                {status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
} 