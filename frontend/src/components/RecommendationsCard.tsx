console.log('RecommendationsCard module is being loaded');

import { useState, useEffect } from 'react';
import { Lightbulb, Flag, Users, BookOpen } from "lucide-react";

interface TeacherInsight {
  topic: string;
  question: string;
  score: string;
}

interface TeacherInsightsResponse {
  highPriorityRecommendations: TeacherInsight;
  mediumPriorityRecommendations: TeacherInsight;
  lowPriorityRecommendations: TeacherInsight;
}

interface RecommendationsCardProps {
  quizId: string;
  teacherId?: number;
}

interface HardestQuestion {
  paper_id: number;
  question_id: number;
  total_wrong_attempts: string;
  total_attempts_per_question: string;
  selected_percentage_wrong: string;
  question_text: string;
  topic_label: string;
}

interface HardestTopic {
  topic_label: string;
  total_wrong_attempts: string;
  total_attempts_per_topic: string;
  selected_percentage_wrong: string;
}

interface IndividualPaperScore {
  student_name: string;
  student_score: string;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  icon: 'flag' | 'users' | 'book';
  type: string;
}

const getPriorityStyles = (priority: string) => {
  switch (priority) {
    case 'high':
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400'
      };
    case 'medium':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-400'
      };
    default:
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400'
      };
  }
};

const getIcon = (icon: string) => {
  switch (icon) {
    case 'flag':
      return <Flag className="h-4 w-4" />;
    case 'users':
      return <Users className="h-4 w-4" />;
    case 'book':
      return <BookOpen className="h-4 w-4" />;
    default:
      return <Lightbulb className="h-4 w-4" />;
  }
};

export function RecommendationsCard({ 
  quizId,
  teacherId = 5
}: RecommendationsCardProps) {
  try {
    console.log('RecommendationsCard render attempt started', { quizId, teacherId });
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [insights, setInsights] = useState<TeacherInsightsResponse | null>(null);

    useEffect(() => {
      console.log('RecommendationsCard mounted');
      
      if (typeof window !== 'undefined') {
        console.log('Window loaded - RecommendationsCard module');
      }
      
      return () => console.log('RecommendationsCard unmounted');
    }, []);

    useEffect(() => {
      console.log('RecommendationsCard data fetching effect triggered', { quizId, teacherId });
      const fetchData = async () => {
        try {
          console.log('Starting to fetch data in RecommendationsCard');
          setLoading(true);
          setError(null);

          const baseUrl = 'http://localhost:5003/api';
          console.log('RecommendationsCard API Base URL:', baseUrl);

          // Define fallback insights in case of API failure
          const fallbackInsights: TeacherInsightsResponse = {
            highPriorityRecommendations: {
              topic: 'Focus on enzyme topics where students frequently struggle with applying concepts',
              question: 'Address the questions on chemical testing that show high error rates',
              score: 'Provide additional support for students scoring below 60%'
            },
            mediumPriorityRecommendations: {
              topic: 'Review cell structure and function concepts in your next lesson',
              question: 'Clarify common misconceptions around cell types and identification',
              score: 'Check in with students scoring between 60-75% to ensure understanding'
            },
            lowPriorityRecommendations: {
              topic: 'Continue your current approach for well-understood topics',
              question: 'Maintain your teaching strategy for questions with high success rates',
              score: 'Consider providing enrichment activities for high-performing students'
            }
          };

          // Different data fetching strategies based on quizId
          if (quizId === 'all') {
            try {
              // For 'all' quizzes, use the teacherActionInsights endpoint directly
              const allQuizzesUrl = `${baseUrl}/visualisationGraph/teacherActionInsights`;
              console.log('Fetching all quizzes recommendations from:', allQuizzesUrl);
              
              const allQuizzesResponse = await fetch(allQuizzesUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                  teacher_id: teacherId 
                }),
              });

              console.log('All Quizzes Response Status:', allQuizzesResponse.status);
              if (!allQuizzesResponse.ok) {
                console.warn(`API error: ${allQuizzesResponse.status}. Using fallback data.`);
                setInsights(fallbackInsights);
                setLoading(false);
                return;
              }

              const allQuizzesData = await allQuizzesResponse.json();
              console.log('All Quizzes Response:', allQuizzesData);
              
              if (!allQuizzesData.response) {
                console.warn('Invalid response format. Using fallback data.');
                setInsights(fallbackInsights);
                setLoading(false);
                return;
              }

              setInsights(allQuizzesData.response);
              setLoading(false);
              console.log('Successfully set all quizzes insights:', allQuizzesData.response);
            } catch (error) {
              console.error('Error fetching all quizzes:', error);
              setInsights(fallbackInsights);
              setLoading(false);
            }
          } else {
            // For individual quizzes, continue with existing approach
            try {
              // Fetch hardest questions
              const questionsUrl = `${baseUrl}/visualisationGraph/getHardestQuestionsByPaper`;
              console.log('Fetching hardest questions from:', questionsUrl);
              const hardestQuestionsResponse = await fetch(questionsUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                  paper_id: Number(quizId),
                  teacher_id: teacherId 
                }),
              });

              console.log('Questions Response Status:', hardestQuestionsResponse.status);
              if (!hardestQuestionsResponse.ok) {
                console.warn(`API error: ${hardestQuestionsResponse.status}. Using fallback data.`);
                setInsights(fallbackInsights);
                setLoading(false);
                return;
              }

              const hardestQuestionsData = await hardestQuestionsResponse.json();
              console.log('Hardest Questions Data:', hardestQuestionsData);

              // Fetch hardest topics
              const topicsUrl = `${baseUrl}/visualisationGraph/getHardestTopicByPaper`;
              console.log('Fetching hardest topics from:', topicsUrl);
              const hardestTopicsResponse = await fetch(topicsUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                  paper_id: Number(quizId),
                  teacher_id: teacherId 
                }),
              });

              console.log('Topics Response Status:', hardestTopicsResponse.status);
              if (!hardestTopicsResponse.ok) {
                console.warn(`API error: ${hardestTopicsResponse.status}. Using fallback data.`);
                setInsights(fallbackInsights);
                setLoading(false);
                return;
              }

              const hardestTopicsData = await hardestTopicsResponse.json();
              console.log('Hardest Topics Data:', hardestTopicsData);

              // Fetch individual paper scores
              const scoresUrl = `${baseUrl}/visualisationGraph/getIndividualPaperAllScore/${quizId}`;
              console.log('Fetching individual scores from:', scoresUrl);
              const individualScoresResponse = await fetch(scoresUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                  teacher_id: teacherId 
                }),
              });

              console.log('Scores Response Status:', individualScoresResponse.status);
              if (!individualScoresResponse.ok) {
                console.warn(`API error: ${individualScoresResponse.status}. Using fallback data.`);
                setInsights(fallbackInsights);
                setLoading(false);
                return;
              }

              const individualScoresData = await individualScoresResponse.json();
              console.log('Individual Scores Data:', individualScoresData);

              // Prepare payload for recommendations
              const payload = {
                hardestQuestionsByPaper: hardestQuestionsData.data || [],
                hardestTopicsByPaper: hardestTopicsData.data || [],
                individualPaperScores: individualScoresData || [] // Remove .data since the endpoint returns the array directly
              };

              console.log('Sending payload to recommendations:', payload);

              // Get recommendations for individual paper
              const recommendationsUrl = `${baseUrl}/visualisationGraph/teacherActionInsightsIndividual`;
              console.log('Fetching individual paper recommendations from:', recommendationsUrl);
              const recommendationsResponse = await fetch(recommendationsUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              });

              console.log('Recommendations Response Status:', recommendationsResponse.status);
              if (!recommendationsResponse.ok) {
                console.warn(`API error: ${recommendationsResponse.status}. Using fallback data.`);
                setInsights(fallbackInsights);
                setLoading(false);
                return;
              }

              const recommendationsData = await recommendationsResponse.json();
              console.log('Recommendations Response:', recommendationsData);
              
              if (!recommendationsData.response) {
                console.warn('Invalid response format from recommendations API. Using fallback data.');
                setInsights(fallbackInsights);
                setLoading(false);
                return;
              }

              setInsights(recommendationsData.response);
              setLoading(false);
              console.log('Successfully set insights:', recommendationsData.response);
            } catch (error) {
              console.error('Error fetching individual quiz data:', error);
              setInsights(fallbackInsights);
              setLoading(false);
            }
          }
        } catch (err) {
          console.error('Error in RecommendationsCard fetchData:', err);
          setError(err instanceof Error ? err.message : 'An error occurred while fetching insights');
          setLoading(false);
        }
      };

      fetchData().catch(err => {
        console.error('Unhandled error in RecommendationsCard fetchData:', err);
      });
    }, [quizId, teacherId]);

    console.log('RecommendationsCard about to render', { loading, error, insights });

    // Prepare teacher action tasks by priority level
    const prepareActionTasks = (insights: TeacherInsightsResponse | null) => {
      if (!insights) return { high: [], medium: [], low: [] };
      
      const filterRecommendations = (text: string) => {
        return text && text.trim() !== "" && !text.includes("No recommendations");
      };
      
      return {
        high: [
          insights.highPriorityRecommendations.topic,
          insights.highPriorityRecommendations.question,
          insights.highPriorityRecommendations.score
        ].filter(filterRecommendations),
        medium: [
          insights.mediumPriorityRecommendations.topic,
          insights.mediumPriorityRecommendations.question,
          insights.mediumPriorityRecommendations.score
        ].filter(filterRecommendations),
        low: [
          insights.lowPriorityRecommendations.topic,
          insights.lowPriorityRecommendations.question,
          insights.lowPriorityRecommendations.score
        ].filter(filterRecommendations)
      };
    };

    const actionTasks = prepareActionTasks(insights);

    if (loading) {
      return (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm animate-pulse">
              <div className="flex gap-3 items-start">
                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-red-500 dark:text-red-400 p-4 text-center">
          {error}
        </div>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-3">
        {/* High Priority Card */}
        <div className="bg-red-50/50 dark:bg-red-950/10 p-5 rounded-xl border border-red-100 dark:border-red-900/20 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-3 text-red-700 dark:text-red-400 flex items-center gap-2">
            <Flag className="h-5 w-5" />
            High Priority Tasks
          </h3>
          {actionTasks.high.length > 0 ? (
            <ul className="space-y-3">
              {actionTasks.high.map((task, index) => (
                <li key={`high-${index}`} className="flex gap-2 items-start">
                  <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-1 rounded-full flex-shrink-0 mt-0.5">
                    <Lightbulb className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                    {task}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-sm italic">No high priority tasks</p>
          )}
        </div>

        {/* Medium Priority Card */}
        <div className="bg-amber-50/50 dark:bg-amber-950/10 p-5 rounded-xl border border-amber-100 dark:border-amber-900/20 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-3 text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Medium Priority Tasks
          </h3>
          {actionTasks.medium.length > 0 ? (
            <ul className="space-y-3">
              {actionTasks.medium.map((task, index) => (
                <li key={`medium-${index}`} className="flex gap-2 items-start">
                  <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 p-1 rounded-full flex-shrink-0 mt-0.5">
                    <Lightbulb className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                    {task}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-sm italic">No medium priority tasks</p>
          )}
        </div>

        {/* Low Priority Card */}
        <div className="bg-blue-50/50 dark:bg-blue-950/10 p-5 rounded-xl border border-blue-100 dark:border-blue-900/20 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-3 text-blue-700 dark:text-blue-400 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Low Priority Tasks
          </h3>
          {actionTasks.low.length > 0 ? (
            <ul className="space-y-3">
              {actionTasks.low.map((task, index) => (
                <li key={`low-${index}`} className="flex gap-2 items-start">
                  <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 p-1 rounded-full flex-shrink-0 mt-0.5">
                    <Lightbulb className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                    {task}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-sm italic">No low priority tasks</p>
          )}
        </div>
      </div>
    );
  } catch (err) {
    console.error('Critical error in RecommendationsCard:', err);
    return <div className="text-red-500">Error rendering recommendations</div>;
  }
}