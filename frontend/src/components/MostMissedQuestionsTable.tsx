'use client';

import { useEffect, useState } from 'react';

interface Question {
  question_text: string;
  selected_percentage_wrong: number;
  explanation?: string;
}

interface MostMissedQuestionsTableProps {
  quizId: string;
  teacherId?: number;
}

const API_BASE_URL = 'http://localhost:5003/api';

export default function MostMissedQuestionsTable({ quizId, teacherId }: MostMissedQuestionsTableProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!teacherId && quizId === 'all') {
          throw new Error('Teacher ID is required for overview');
        }

        const endpoint = quizId === 'all' 
          ? `${API_BASE_URL}/visualisationGraph/getHardestQuestionsOverview`
          : `${API_BASE_URL}/visualisationGraph/getHardestQuestionsByPaper`;

        const requestBody = quizId === 'all' 
          ? { teacher_id: teacherId }
          : { paper_id: Number(quizId) };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch questions: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const questionsData = data.data || [];

        if (!Array.isArray(questionsData)) {
          throw new Error('Invalid response format: expected an array of questions');
        }

        // Fetch explanations for each question
        const questionsWithExplanations = await Promise.all(
          questionsData.map(async (question: Question) => {
            try {
              const explanationResponse = await fetch(`${API_BASE_URL}/visualisationGraph/reccomendationForResultsAllPapersNew`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                body: JSON.stringify({
                  question_text: question.question_text,
                  image_paths: "",
                  most_wrong_answer_text: "Most common incorrect answer"
                }),
              });

              if (explanationResponse.ok) {
                const explanationData = await explanationResponse.json();
                return {
                  ...question,
                  explanation: explanationData.explanation,
                };
              }
              return question;
            } catch (error) {
              console.error('Error fetching explanation:', error);
              return question;
            }
          })
        );

        setQuestions(questionsWithExplanations.slice(0, 3));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        console.error('Error fetching questions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [quizId, teacherId]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/50">
            <th className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
              #
            </th>
            <th className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
              Question
            </th>
            <th className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
              % Wrong
            </th>
            <th className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
              Explanation
            </th>
          </tr>
        </thead>
        <tbody>
          {questions.map((question, index) => (
            <tr key={index} className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                {index + 1}
              </td>
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                {question.question_text}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  question.selected_percentage_wrong >= 70
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                    : question.selected_percentage_wrong >= 50
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                }`}>
                  {question.selected_percentage_wrong}%
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                {question.explanation || 'No explanation available'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 