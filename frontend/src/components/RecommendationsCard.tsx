console.log('RecommendationsCard module is being loaded');
window.addEventListener('load', () => console.log('Window loaded - RecommendationsCard module'));

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

          // Fetch hardest questions
          const questionsUrl = `${baseUrl}/visualisationGraph/getHardestQuestionsByPaper`;
          console.log('Fetching hardest questions from:', questionsUrl);
          const hardestQuestionsResponse = await fetch(questionsUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
              paper_id: quizId === 'all' ? null : Number(quizId),
              teacher_id: teacherId 
            }),
          });

          console.log('Questions Response Status:', hardestQuestionsResponse.status);
          if (!hardestQuestionsResponse.ok) {
            throw new Error(`Failed to fetch hardest questions: ${hardestQuestionsResponse.status}`);
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
              paper_id: quizId === 'all' ? null : Number(quizId),
              teacher_id: teacherId 
            }),
          });

          console.log('Topics Response Status:', hardestTopicsResponse.status);
          if (!hardestTopicsResponse.ok) {
            throw new Error(`Failed to fetch hardest topics: ${hardestTopicsResponse.status}`);
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
              paper_id: quizId === 'all' ? null : Number(quizId),
              teacher_id: teacherId 
            }),
          });

          console.log('Scores Response Status:', individualScoresResponse.status);
          if (!individualScoresResponse.ok) {
            throw new Error(`Failed to fetch individual scores: ${individualScoresResponse.status}`);
          }

          const individualScoresData = await individualScoresResponse.json();
          console.log('Individual Scores Data:', individualScoresData);

          // Prepare payload for recommendations
          const payload = {
            hardestQuestionsByPaper: hardestQuestionsData.data || [],
            hardestTopicsByPaper: hardestTopicsData.data || [],
            individualPaperScores: individualScoresData.data || []
          };

          console.log('Sending payload to recommendations:', payload);

          // Get recommendations
          const recommendationsUrl = `${baseUrl}/visualisationGraph/teacherActionInsightsIndividual`;
          console.log('Fetching recommendations from:', recommendationsUrl);
          const recommendationsResponse = await fetch(recommendationsUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          console.log('Recommendations Response Status:', recommendationsResponse.status);
          if (!recommendationsResponse.ok) {
            throw new Error(`Failed to fetch recommendations: ${recommendationsResponse.status}`);
          }

          const recommendationsData = await recommendationsResponse.json();
          console.log('Recommendations Response:', recommendationsData);
          
          if (!recommendationsData.response) {
            throw new Error('Invalid response format from recommendations API');
          }

          setInsights(recommendationsData.response);
          setLoading(false);
          console.log('Successfully set insights:', recommendationsData.response);
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

    const recommendations: Recommendation[] = insights ? [
      {
        priority: 'high',
        title: 'High Priority',
        description: insights.highPriorityRecommendations.topic,
        icon: 'flag'
      },
      {
        priority: 'medium',
        title: 'Medium Priority',
        description: insights.mediumPriorityRecommendations.topic,
        icon: 'users'
      },
      {
        priority: 'low',
        title: 'Low Priority',
        description: insights.lowPriorityRecommendations.topic,
        icon: 'book'
      }
    ] : [];

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
      <div className="grid gap-4 md:grid-cols-3">
        {recommendations.map((rec, index) => {
          const styles = getPriorityStyles(rec.priority);
          return (
            <div key={index} className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-3 items-start">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${styles.bg} ${styles.text} shrink-0`}>
                  {getIcon(rec.icon)}
                </div>
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200 mb-1 text-sm">
                    {rec.title}
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">
                    {rec.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  } catch (err) {
    console.error('Critical error in RecommendationsCard:', err);
    return <div className="text-red-500">Error rendering recommendations</div>;
  }
} 