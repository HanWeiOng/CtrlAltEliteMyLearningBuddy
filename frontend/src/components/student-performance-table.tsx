"use client"

import { useState } from "react"
import { ArrowUp, ArrowDown, ChevronUp, ChevronDown, AlertTriangle, Award, CheckCircle } from "lucide-react"

// Student data
const initialStudents = [
  { id: 1, name: "Roy", score: 94, trend: "up" },
  { id: 2, name: "K2", score: 87, trend: "up" },
  { id: 3, name: "Brad", score: 84, trend: "stable" },
  { id: 4, name: "PK", score: 78, trend: "down" },
  { id: 5, name: "Jamie", score: 45, trend: "down" }
]

// Define component props
interface StudentPerformanceTableProps {
  quizId?: string;
  teacherId?: number;
}

export function StudentPerformanceTable({ quizId = 'all', teacherId }: StudentPerformanceTableProps) {
  const [students, setStudents] = useState(initialStudents)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // In a real app, we would filter or fetch data based on quizId and teacherId
  // For now, we'll just log it for demonstration
  console.log(`Rendering StudentPerformanceTable with quizId: ${quizId}, teacherId: ${teacherId}`);

  // Function to sort students
  const sortStudents = () => {
    const newDirection = sortDirection === "desc" ? "asc" : "desc"
    setSortDirection(newDirection)

    const sortedStudents = [...students].sort((a, b) => {
      if (newDirection === "desc") {
        return b.score - a.score
      } else {
        return a.score - b.score
      }
    })

    setStudents(sortedStudents)
  }

  // Function to get badge style based on score
  const getBadgeColor = (score: number) => {
    if (score >= 85) return 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'; 
    if (score >= 75) return 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400';   
    if (score >= 65) return 'bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400'; 
    if (score >= 55) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'; 
    return 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400';                     
  };

  // Function to get background color for rank indicator
  const getRankBgColor = (score: number) => {
    if (score >= 85) return 'bg-green-50 dark:bg-green-950/20'; 
    if (score >= 75) return 'bg-blue-50 dark:bg-blue-950/20';   
    if (score >= 65) return 'bg-violet-50 dark:bg-violet-950/20'; 
    if (score >= 55) return 'bg-amber-50 dark:bg-amber-950/20'; 
    return 'bg-red-50 dark:bg-red-950/20';                     
  };

  // Function to get trend indicator
  const getTrendIndicator = (trend: string) => {
    switch (trend) {
      case "up":
        return <ChevronUp className="h-3 w-3 text-emerald-500" />;
      case "down":
        return <ChevronDown className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  // Function to get performance status icon
  const getStatusIcon = (score: number) => {
    if (score >= 85) return <Award className="h-3.5 w-3.5 text-green-500" aria-label="Excellent" />;
    if (score >= 65) return <CheckCircle className="h-3.5 w-3.5 text-blue-500" aria-label="Satisfactory" />;
    return <AlertTriangle className="h-3.5 w-3.5 text-red-500" aria-label="Needs Improvement" />;
  };

  return (
    <div>
      <div className="rounded-lg overflow-hidden mb-2">
        <div className="flex items-center justify-between py-3 px-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/30">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">#</div>
          <div className="flex-1 ml-4 text-xs font-medium text-slate-500 dark:text-slate-400">Student</div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            <button
              onClick={sortStudents}
              className="inline-flex items-center font-medium hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Score
              {sortDirection === "desc" ? (
                <ArrowDown className="h-3 w-3 ml-1" />
              ) : (
                <ArrowUp className="h-3 w-3 ml-1" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        {students.map((student, index) => (
          <div
            key={student.id}
            className="rounded-lg border border-slate-100 dark:border-slate-800/30 shadow-sm hover:shadow-md transition-shadow p-3 bg-white dark:bg-slate-900/50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${getRankBgColor(student.score)}`}>
                  {index + 1}
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{student.name}</span>
                  <span>{getTrendIndicator(student.trend)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span>{getStatusIcon(student.score)}</span>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(student.score)}`}>
                  {student.score}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 