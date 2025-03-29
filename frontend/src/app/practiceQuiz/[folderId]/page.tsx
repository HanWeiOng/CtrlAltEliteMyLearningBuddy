"use client";

import { useParams, useRouter } from "next/navigation"; // Import useRouter
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Navbar from "@/components/ui/navbar"; // Import Navbar for consistency

interface Question {
  id: number
  question_text: string
  answer_key: string
  answer_options: Array<{
    option: string
    text: string | Record<string, string>
  }>
  image_paths?: string
}

interface QuizProgress {
  current: number
  total: number
  score: {
    percentage: number
    fraction: string
  }
}

// Server Component
export default function TakeQuizPage({ params }: { params: { folderId: string } }) {
  return <QuizContent folderId={params.folderId} />
}

// Client Component
function QuizContent({ folderId }: { folderId: string }) {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({})
  const [explanations, setExplanations] = useState<{ [key: number]: string }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [progress, setProgress] = useState<QuizProgress>({
    current: 0,
    total: 0,
    score: {
      percentage: 0,
      fraction: "0/0"
    }
  })

  const fetchQuestions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`http://localhost:5003/api/practiceQuiz/getQuestionsByFolderId?folderId=${folderId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch questions')
      }
      const data = await response.json()
      setQuestions(data)
      setProgress(prev => ({ ...prev, total: data.length }))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch questions')
      console.error('Error fetching questions:', err)
    } finally {
      setIsLoading(false)
    }
  };

  useEffect(() => {
    if (folderId) {
      fetchQuestions()
    }
  }, [folderId])

  const calculateScore = () => {
    if (questions.length === 0) return;

    let correctCount = 0;
    let totalAnswered = 0;

    questions.forEach(question => {
      const userAnswer = userAnswers[question.id];
      if (userAnswer) {
        totalAnswered++;
        if (userAnswer === question.answer_key) {
          correctCount++;
        }
      }
    });

    const percentage = Math.round((correctCount / totalAnswered) * 100) || 0;
    const fraction = `${correctCount}/${questions.length}`;

    setProgress(prev => ({
      ...prev,
      current: totalAnswered,
      score: { percentage, fraction }
    }));

    if (totalAnswered === questions.length) {
      setIsComplete(true);
    }
  };

  const selectAnswer = async (questionId: number, selectedOption: string) => {
    if (userAnswers[questionId]) return; // Prevent multiple answers

    const currentQuestion = questions.find(q => q.id === questionId);
    if (!currentQuestion) return;

    // Update answers
    setUserAnswers(prev => {
      const newAnswers = { ...prev, [questionId]: selectedOption };
      // Use setTimeout to ensure state is updated before calculating score
      setTimeout(() => calculateScore(), 0);
      return newAnswers;
    });

    if (selectedOption === currentQuestion.answer_key) {
      setExplanations(prev => ({
        ...prev,
        [questionId]: "✅ Correct! Great job!"
      }));
    } else {
      try {
        const response = await fetch("http://localhost:5003/api/createquiz/postWrongAnswer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: currentQuestion.question_text,
            userAnswer: {
              option: selectedOption,
              text: currentQuestion.answer_options.find(opt => opt.option === selectedOption)?.text
            },
            correctAnswer: {
              option: currentQuestion.answer_key,
              text: currentQuestion.answer_options.find(opt => opt.option === currentQuestion.answer_key)?.text
            },
            options: currentQuestion.answer_options,
            imageUrl: currentQuestion.image_paths
          }),
        })

        const data = await response.json()
        if (response.ok) {
          setExplanations(prev => ({
            ...prev,
            [questionId]: data.explanation
          }))
        } else {
          setExplanations(prev => ({
            ...prev,
            [questionId]: "❌ Incorrect — but couldn't explain why."
          }))
        }
      } catch (error) {
        console.error("Error explaining wrong answer:", error)
        setExplanations(prev => ({
          ...prev,
          [questionId]: "⚠️ Something went wrong. Please try again."
        }))
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C3AED]"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading quiz...</span>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center text-red-600 dark:text-red-400">
            <p>{error}</p>
            <Button 
              onClick={fetchQuestions} 
              className="mt-4 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Retry
            </Button>
          </div>
        </main>
      </div>
    )
  }


  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Navbar */}
      <Navbar />
      <div className="sticky top-0 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push('/practiceQuiz')}
              className="gap-2 text-[#7C3AED] hover:text-[#7C3AED] hover:bg-[#7C3AED]/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Folders
            </Button>
            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Questions Answered: {progress.current} of {progress.total}
              </div>
              <div className="text-sm font-medium text-[#7C3AED]">
                Current Score: {progress.score.percentage}% ({progress.score.fraction})
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {questions.map((question, index) => (
            <div 
              key={question.id} 
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 transition-all duration-200 hover:shadow-md"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Question {index + 1}: {question.question_text}
              </h2>
              {question.image_paths && (
                <img
                  src={question.image_paths}
                  alt="Question"
                  className="mb-6 max-w-full rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                />
              )}
              <div className="space-y-3">
                {question.answer_options.map((option, optionIndex) => {
                  const isSelected = userAnswers[question.id] === option.option
                  const isCorrect = question.answer_key === option.option
                  const hasAnswered = !!userAnswers[question.id]

                  return (
                    <button
                      key={optionIndex}
                      onClick={() => !hasAnswered && selectAnswer(question.id, option.option)}
                      disabled={hasAnswered}
                      className={`w-full p-4 text-left rounded-lg border transition-all duration-200 ${
                        hasAnswered
                          ? isSelected && isCorrect
                            ? "bg-green-50 border-green-500 dark:bg-green-900/20 dark:border-green-500"
                            : isSelected && !isCorrect
                            ? "bg-red-50 border-red-500 dark:bg-red-900/20 dark:border-red-500"
                            : isCorrect
                            ? "bg-green-50 border-green-500 dark:bg-green-900/20 dark:border-green-500"
                            : "opacity-50 cursor-not-allowed"
                          : "hover:bg-[#7C3AED]/5 dark:hover:bg-[#7C3AED]/10 border-gray-200 dark:border-gray-700 hover:border-[#7C3AED] dark:hover:border-[#7C3AED]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {hasAnswered && (
                          isSelected && isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : isSelected && !isCorrect ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : null
                        )}
                        <span className="font-medium">{option.option}:</span>
                        <span>
                          {typeof option.text === "object"
                            ? Object.entries(option.text).map(([key, value]) => (
                                <span key={key}>
                                  {key}: {value},{" "}
                                </span>
                              ))
                            : option.text}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {explanations[question.id] && (
                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-400 text-yellow-900 dark:text-yellow-100 rounded shadow-sm animate-fadeIn whitespace-pre-line">
                  <div className="font-semibold mb-1">🧠 Tutor's Explanation:</div>
                  <div>{explanations[question.id]}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {isComplete && (
          <div className="mt-12 space-y-8 animate-fadeIn">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Quiz Complete!
              </h2>
              <div className="text-4xl font-bold text-[#7C3AED] mb-6">
                {progress.score.percentage}%
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                You got {progress.score.fraction} questions correct
              </p>
              <Button
                onClick={() => router.push('/practiceQuiz')}
                className="rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Return to Folders
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}