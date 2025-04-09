"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Target,
  TrendingUp,
  Users,
  AlertTriangle,
  Flag,
  BookOpen,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  User,
  Filter,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { ClassAverageChart } from "@/components/class-average-chart";
import { ConceptMasteryChart } from "@/components/concept-mastery-chart";
import { StudentPerformanceTable } from "@/components/student-performance-table";
import { ProgressRing } from "@/components/progress-ring";
import RoleRestrictionWrapper from "@/components/RoleRestrictionWrapper";

// Quiz data structure
type Quiz = {
  id: string;
  name: string;
};

// Completion rate data type
type CompletionRateData = {
  completionRate: number;
  change: number;
};

// Average score data type
type AverageScoreData = {
  score: number | null;
  change: number;
};

// Median score data type
type MedianScoreData = {
  score: number | null;
  change: number;
};

// Global constant for teacher ID (hardcoded until auth is implemented)
const TEACHER_ID = 5;

export default function DashboardPage() {
  // State for quizzes and selected quiz
  const [quizzes, setQuizzes] = useState<Quiz[]>([
    { id: "all", name: "All Quizzes" }, // Default option while loading
  ]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz>({
    id: "all",
    name: "All Quizzes",
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [completionRate, setCompletionRate] = useState<CompletionRateData>({
    completionRate: 0,
    change: 0,
  });
  const [averageScore, setAverageScore] = useState<AverageScoreData>({
    score: null,
    change: 0,
  });
  const [medianScore, setMedianScore] = useState<MedianScoreData>({
    score: null,
    change: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [hardestTopicBarData, setHardestTopicBarData] = useState<Topic[]>([]);
  const [paperDemographicBarData, setPaperDemographicBarData] = useState<PaperDemographic[]>([]);
  const [questions, setQuestions] = useState<HardestQuestion[]>([]);

  // Function to fetch quizzes from API
  const fetchQuizzes = async () => {
    setIsLoadingQuizzes(true);
    try {
      // Pass teacher_id query parameter if needed by your API
      const response = await fetch(
        `http://localhost:5003/api/visualisationGraph/getAllQuizzes?teacher_id=${TEACHER_ID}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch quizzes");
      }

      const data = await response.json();
      setQuizzes(data);
      // If there are quizzes (beyond the "All Quizzes" option), select the first one
      if (data.length > 1) {
        setSelectedQuiz(data[0]);
      }
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      // Fallback to default quizzes in case of error
      setQuizzes([
        { id: "all", name: "All Quizzes" },
        { id: "quiz-1", name: "Quiz 1: Linear Functions" },
        { id: "quiz-2", name: "Quiz 2: Quadratic Equations" },
        { id: "quiz-3", name: "Quiz 3: Inequalities" },
        { id: "quiz-4", name: "Quiz 4: Polynomials" },
      ]);
    } finally {
      setIsLoadingQuizzes(false);
    }
  };


    const fetchHardestTopic = async (quizId: string, teacherId?: number) => {
    try {
      let response;
  
      if (quizId === 'all') {
        if (!teacherId) {
          throw new Error("Teacher ID is required when quizId is 'all'");
        }
  
        response = await fetch("http://localhost:5003/api/visualisationGraph/getHardestTopicOverview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ teacher_id: teacherId }),
        });
      } else {
        response = await fetch("http://localhost:5003/api/visualisationGraph/getHardestTopicByPaper", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ paper_id: Number(quizId) }),
        });
      }
  
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
      const result = await response.json();
  
      const parsedData: Topic[] = result.data.map((item: any) => ({
        topic_label: item.topic_label,
        wrong_ratio: parseFloat(item.selected_percentage_wrong) / 100,
      }));

  
      setHardestTopicBarData(parsedData);
    } catch (error) {
      console.error("Error occurred while making the request:", error);
    }
  };

  // Function to handle quiz selection
  const handleQuizSelect = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setIsDropdownOpen(false);
    // fetchQuizData will be called via the useEffect
  };

  // Function to fetch completion rate data
  const fetchCompletionRate = async (quizId: string) => {
    setIsLoading(true);
    try {
      // Using the POST endpoint with teacher_id
      const response = await fetch(
        "http://localhost:5003/api/visualisationGraph/getCompletionOfQuiz",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            teacher_id: TEACHER_ID,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      if (quizId === "all") {
        // For "All Quizzes", calculate the overall stats
        let totalCompleted = 0;
        let totalAttempts = 0;
        let totalScore = 0;
        let totalScoreCount = 0;

        // This is a simplification for median across quizzes
        // For a true median calculation, we would need all individual scores
        let allMedians: number[] = [];

        Object.values(data).forEach((quizData: any) => {
          // Completion rate calculation
          totalCompleted += quizData.completedCount || 0;
          totalAttempts +=
            (quizData.completedCount || 0) + (quizData.notCompletedCount || 0);

          // Average score calculation
          if (
            quizData.averageScoreCompleted &&
            !isNaN(parseFloat(quizData.averageScoreCompleted))
          ) {
            totalScore +=
              parseFloat(quizData.averageScoreCompleted) *
              (quizData.completedCount || 0);
            totalScoreCount += quizData.completedCount || 0;
          }

          // Collect median scores
          if (
            quizData.medianScoreCompleted &&
            !isNaN(parseFloat(quizData.medianScoreCompleted))
          ) {
            allMedians.push(parseFloat(quizData.medianScoreCompleted));
          }
        });

        const overallRate =
          totalAttempts > 0
            ? Math.round((totalCompleted / totalAttempts) * 100)
            : 0;
        const overallAverage =
          totalScoreCount > 0
            ? parseFloat((totalScore / totalScoreCount).toFixed(2))
            : null;

        // For all quizzes, we'll use a simple average of medians as an approximation
        const overallMedian =
          allMedians.length > 0
            ? parseFloat(
                (
                  allMedians.reduce((a, b) => a + b, 0) / allMedians.length
                ).toFixed(2)
              )
            : null;

        setCompletionRate({
          completionRate: overallRate,
          change: 0, // We don't have change data for the overall completion
        });

        setAverageScore({
          score: overallAverage,
          change: 0, // For now, no change data for overall average
        });

        setMedianScore({
          score: overallMedian,
          change: 0, // For now, no change data for overall median
        });
      } else {
        // For specific quiz, use that quiz's data
        const quizData = data[quizId];
        if (quizData) {
          // Completion rate
          const total =
            (quizData.completedCount || 0) + (quizData.notCompletedCount || 0);
          const rate =
            total > 0 ? Math.round((quizData.completedCount / total) * 100) : 0;

          // Average score
          let avgScore = null;
          if (
            quizData.averageScoreCompleted &&
            !isNaN(parseFloat(quizData.averageScoreCompleted))
          ) {
            avgScore = parseFloat(quizData.averageScoreCompleted);
          }

          // Median score
          let medScore = null;
          if (
            quizData.medianScoreCompleted &&
            !isNaN(parseFloat(quizData.medianScoreCompleted))
          ) {
            medScore = parseFloat(quizData.medianScoreCompleted);
          }

          setCompletionRate({
            completionRate: rate,
            change: 0, // For now, no change data for individual quizzes
          });

          setAverageScore({
            score: avgScore,
            change: 0, // For now, no change data for individual quizzes
          });

          setMedianScore({
            score: medScore,
            change: 0, // For now, no change data for individual quizzes
          });
        } else {
          // Fallback if no data found for this quiz
          setCompletionRate({ completionRate: 0, change: 0 });
          setAverageScore({ score: null, change: 0 });
          setMedianScore({ score: null, change: 0 });
        }
      }
    } catch (error) {
      console.error("Error fetching completion rate:", error);
      // Fallback to default values in case of error
      setCompletionRate({ completionRate: 50, change: 5 });
      setAverageScore({ score: 78, change: 2 });
      setMedianScore({ score: 76, change: 3 });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch quizzes on initial load
  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Fetch completion rate when quiz selection changes
  useEffect(() => {
    if (selectedQuiz) {
      fetchCompletionRate(selectedQuiz.id);
    }
  }, [selectedQuiz]);

  return (
    <RoleRestrictionWrapper allowedRoles={["teacher"]}>
      <div className="flex w-full flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <main className="flex flex-col gap-6 p-4 md:gap-8 md:p-8">
          {/* Quiz Selector */}
          <div className="w-full flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6" />
              Dashboard
            </h1>

            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={isLoadingQuizzes}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                {isLoadingQuizzes ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading Quizzes...
                  </>
                ) : (
                  <>
                    <Filter className="h-4 w-4" />
                    {selectedQuiz.name}
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </>
                )}
              </button>

              {isDropdownOpen && !isLoadingQuizzes && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10">
                  <ul className="py-1 max-h-96 overflow-auto">
                    {quizzes.map((quiz) => (
                      <li key={quiz.id}>
                        <button
                          onClick={() => handleQuizSelect(quiz)}
                          className={`w-full text-left px-4 py-2 text-sm ${
                            selectedQuiz.id === quiz.id
                              ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                          }`}
                        >
                          <div className="font-medium">{quiz.name}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Selected Quiz Info */}
          {selectedQuiz.id !== "all" && (
            <div className="w-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-lg p-3 mb-2">
              <div className="flex items-center text-indigo-700 dark:text-indigo-400">
                <span className="text-sm font-medium">
                  Viewing analytics for:{" "}
                </span>
                <span className="ml-2 font-bold">{selectedQuiz.name}</span>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid gap-6 md:grid-cols-5">
            <div className="md:col-span-5 md:grid md:grid-cols-3 md:gap-6">
              <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md hover:shadow-lg transition-shadow rounded-lg">
                <div className="pb-2 bg-gradient-to-r from-indigo-500/10 to-indigo-500/5 dark:from-indigo-500/20 dark:to-indigo-500/10 p-4">
                  <h3 className="text-sm font-medium flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                    <CheckCircle className="w-5 h-5" />
                    Completion Rate
                  </h3>
                </div>
                <div className="pt-4 p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="h-[60px] w-[60px] flex items-center justify-center">
                        {isLoading ? (
                          <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-[60px] w-[60px] rounded-full"></div>
                        ) : (
                          <ProgressRing
                            value={completionRate.completionRate}
                            size={60}
                            strokeWidth={6}
                          />
                        )}
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                          {isLoading ? (
                            <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-16 rounded"></div>
                          ) : (
                            `${completionRate.completionRate}%`
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          of students completed
                        </div>
                      </div>
                    </div>
                    {completionRate.change !== 0 && (
                      <div
                        className={`text-xs ${
                          completionRate.change > 0
                            ? "text-emerald-500"
                            : "text-red-500"
                        } font-medium flex items-center ${
                          completionRate.change > 0
                            ? "bg-emerald-50 dark:bg-emerald-950/30"
                            : "bg-red-50 dark:bg-red-950/30"
                        } px-2 py-1 rounded-full`}
                      >
                        {completionRate.change > 0 ? (
                          <ArrowUp className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDown className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(completionRate.change)}% from last quiz
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md hover:shadow-lg transition-shadow rounded-lg">
                <div className="pb-2 bg-gradient-to-r from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/10 p-4">
                  <h3 className="text-sm font-medium flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <BarChart3 className="w-5 h-5" />
                    Average Score
                  </h3>
                </div>
                <div className="pt-4 p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="h-[60px] w-[60px] flex items-center justify-center">
                        {isLoading ? (
                          <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-[60px] w-[60px] rounded-full"></div>
                        ) : (
                          <ProgressRing
                            value={
                              averageScore.score !== null
                                ? averageScore.score
                                : 0
                            }
                            size={60}
                            strokeWidth={6}
                            color="#818cf8"
                            textColor="#818cf8"
                          />
                        )}
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                          {isLoading ? (
                            <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-16 rounded"></div>
                          ) : averageScore.score !== null ? (
                            `${averageScore.score}%`
                          ) : (
                            "N/A"
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          average score
                        </div>
                      </div>
                    </div>
                    {averageScore.change !== 0 && (
                      <div
                        className={`text-xs ${
                          averageScore.change > 0
                            ? "text-emerald-500"
                            : "text-red-500"
                        } font-medium flex items-center ${
                          averageScore.change > 0
                            ? "bg-emerald-50 dark:bg-emerald-950/30"
                            : "bg-red-50 dark:bg-red-950/30"
                        } px-2 py-1 rounded-full`}
                      >
                        {averageScore.change > 0 ? (
                          <ArrowUp className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDown className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(averageScore.change)} points from last quiz
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md hover:shadow-lg transition-shadow rounded-lg">
                <div className="pb-2 bg-gradient-to-r from-purple-500/10 to-purple-500/5 dark:from-purple-500/20 dark:to-purple-500/10 p-4">
                  <h3 className="text-sm font-medium flex items-center gap-2 text-purple-700 dark:text-purple-400">
                    <Target className="w-5 h-5" />
                    Median Score
                  </h3>
                </div>
                <div className="pt-4 p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="h-[60px] w-[60px] flex items-center justify-center">
                        {isLoading ? (
                          <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-[60px] w-[60px] rounded-full"></div>
                        ) : (
                          <ProgressRing
                            value={
                              medianScore.score !== null ? medianScore.score : 0
                            }
                            size={60}
                            strokeWidth={6}
                            color="#a855f7"
                            textColor="#a855f7"
                          />
                        )}
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                          {isLoading ? (
                            <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-16 rounded"></div>
                          ) : medianScore.score !== null ? (
                            `${medianScore.score}%`
                          ) : (
                            "N/A"
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          median performance
                        </div>
                      </div>
                    </div>
                    {medianScore.change !== 0 && (
                      <div
                        className={`text-xs ${
                          medianScore.change > 0
                            ? "text-emerald-500"
                            : "text-red-500"
                        } font-medium flex items-center ${
                          medianScore.change > 0
                            ? "bg-emerald-50 dark:bg-emerald-950/30"
                            : "bg-red-50 dark:bg-red-950/30"
                        } px-2 py-1 rounded-full`}
                      >
                        {medianScore.change > 0 ? (
                          <ArrowUp className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDown className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(medianScore.change)} points from last quiz
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main charts row */}
          <div className="grid gap-6 md:grid-cols-6 h-fit">
            {/* Class Average Chart */}
            <div className="md:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md hover:shadow-lg transition-shadow rounded-lg">
              <div className="bg-gradient-to-r from-indigo-500/10 to-blue-500/5 dark:from-indigo-500/20 dark:to-blue-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-medium">
                      <TrendingUp className="h-5 w-5" />
                      Class Average
                    </h3>
                    <p className="text-sm text-slate-500">
                      Performance trends across quizzes
                    </p>
                  </div>
                  <div className="bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800 px-2 py-1 rounded-full text-xs">
                    <span className="flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Trending Up
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <ClassAverageChart
                  quizId={selectedQuiz.id}
                  teacherId={TEACHER_ID}
                />
              </div>
            </div>

            {/* Concept Mastery Chart */}
            <div className="md:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md hover:shadow-lg transition-shadow rounded-lg">
              <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/5 dark:from-purple-500/20 dark:to-indigo-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-medium">
                      <BarChart3 className="h-5 w-5" />
                      Concept Mastery
                    </h3>
                    <p className="text-sm text-slate-500">
                      Average performance by concept area
                    </p>
                  </div>
                  <div className="bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800 px-2 py-1 rounded-full text-xs">
                    <span className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      Class View
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <ConceptMasteryChart
                  quizId={selectedQuiz.id}
                  teacherId={TEACHER_ID}
                />
              </div>
            </div>

            {/* Student Performance */}
            <div className="md:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md hover:shadow-lg transition-shadow rounded-lg">
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/5 dark:from-purple-500/20 dark:to-blue-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-medium">
                      <Users className="h-5 w-5" />
                      Student Performance
                    </h3>
                    <p className="text-sm text-slate-500">
                      Individual student scores
                    </p>
                  </div>
                  <div className="bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800 px-2 py-1 rounded-full text-xs">
                    <span className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />8 Students
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <StudentPerformanceTable
                  quizId={selectedQuiz.id}
                  teacherId={TEACHER_ID}
                />
              </div>
            </div>
          </div>

          {/* Second row - Most missed questions and support/recommendations */}
          <div className="grid gap-6 md:grid-cols-6 h-fit">
            {/* Most Missed Questions */}
            <div className="md:col-span-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md hover:shadow-lg transition-shadow rounded-lg">
              <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/5 dark:from-blue-500/20 dark:to-indigo-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-medium">
                      <AlertTriangle className="h-5 w-5" />
                      Most Missed Questions
                    </h3>
                    <p className="text-sm text-slate-500">
                      Questions with highest error rates
                    </p>
                  </div>
                  <div className="bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 px-2 py-1 rounded-full text-xs">
                    <span className="flex items-center">
                      <Flag className="h-3 w-3 mr-1" />
                      Priority Focus
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-6 overflow-auto">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
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
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            1
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                            Interpretation of slope in linear functions
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400">
                              70%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            Misinterpretation of rate of change
                          </td>
                        </tr>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            2
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                            Solving quadratic equations
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400">
                              65%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            Calculation errors
                          </td>
                        </tr>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            3
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                            Graphing inequalities
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                              58%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            Confusion with boundary lines
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Need Support Section */}
            <div className="md:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md hover:shadow-lg transition-shadow rounded-lg overflow-hidden">
              {/* Needs Support */}
              <div className="bg-gradient-to-r from-red-500/10 to-orange-500/5 dark:from-red-500/20 dark:to-orange-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium">
                      <Flag className="h-5 w-5" />
                      Needs Support
                    </h3>
                    <p className="text-sm text-slate-500">
                      Students requiring intervention
                    </p>
                  </div>
                  <div className="bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800 px-2 py-1 rounded-full text-xs">
                    <span className="flex items-center">
                      <Flag className="h-3 w-3 mr-1" />5 Students
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <div className="space-y-2">
                  {/* Student 1 */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium text-xs">
                        1
                      </div>
                      <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                        Jamie Smith
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                        45%
                      </div>
                      <span className="text-xs px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400">
                        Critical
                      </span>
                    </div>
                  </div>

                  {/* Student 2 */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium text-xs">
                        2
                      </div>
                      <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                        Alex Johnson
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                        52%
                      </div>
                      <span className="text-xs px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400">
                        Critical
                      </span>
                    </div>
                  </div>

                  {/* Student 3 */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium text-xs">
                        3
                      </div>
                      <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                        Taylor Williams
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        58%
                      </div>
                      <span className="text-xs px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                        At Risk
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations row */}
          <div className="grid gap-6 md:grid-cols-5 h-fit">
            {/* Recommendations */}
            <div className="md:col-span-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md hover:shadow-lg transition-shadow rounded-lg">
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/20 dark:to-teal-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                      <Lightbulb className="h-5 w-5" />
                      Recommendations
                    </h3>
                    <p className="text-sm text-slate-500">
                      AI-powered teaching suggestions
                    </p>
                  </div>
                  <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 px-2 py-1 rounded-full text-xs">
                    <span className="flex items-center">
                      <Lightbulb className="h-3 w-3 mr-1" />3 Actions
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  {/* High Priority */}
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex gap-3 items-start">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 shrink-0">
                        <Flag className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200 mb-1 text-sm">
                          High Priority
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">
                          Assign extra practice to the 5 students flagged for
                          support on linear functions
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Medium Priority - Small Group */}
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex gap-3 items-start">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shrink-0">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200 mb-1 text-sm">
                          Medium Priority
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">
                          Small group review session for quadratic equations and
                          factoring
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Medium Priority - Class-wide */}
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex gap-3 items-start">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shrink-0">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200 mb-1 text-sm">
                          Medium Priority
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">
                          Class-wide review of graphing inequalities with
                          interactive examples
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </RoleRestrictionWrapper>
  );
}
