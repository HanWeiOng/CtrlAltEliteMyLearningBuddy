"use client";

import React from "react";
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
  CheckCircle,
  User,
} from "lucide-react";
import { ClassAverageChart } from "@/components/class-average-chart";
import { ConceptMasteryChart } from "@/components/concept-mastery-chart";
import { StudentPerformanceTable } from "@/components/student-performance-table";
import { ProgressRing } from "@/components/progress-ring";

export default function DashboardPage() {
  return (
    <div className="flex w-full flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <main className="flex flex-col gap-6 p-4 md:gap-8 md:p-8">
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
                      <ProgressRing value={50} size={60} strokeWidth={6} />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">50%</div>
                      <div className="text-xs text-slate-500">of students completed</div>
                    </div>
                  </div>
                  <div className="text-xs text-emerald-500 font-medium flex items-center bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full">
                    <ArrowUp className="h-3 w-3 mr-1" />
                    5% from last quiz
                  </div>
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
                      <ProgressRing value={80} size={60} strokeWidth={6} color="#818cf8" textColor="#818cf8" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">24/30</div>
                      <div className="text-xs text-slate-500">points on average</div>
                    </div>
                  </div>
                  <div className="text-xs text-emerald-500 font-medium flex items-center bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full">
                    <ArrowUp className="h-3 w-3 mr-1" />2 points from last quiz
                  </div>
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
                      <ProgressRing value={78} size={60} strokeWidth={6} color="#a855f7" textColor="#a855f7" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">78%</div>
                      <div className="text-xs text-slate-500">median performance</div>
                    </div>
                  </div>
                  <div className="text-xs text-emerald-500 font-medium flex items-center bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full">
                    <ArrowUp className="h-3 w-3 mr-1" />
                    3% from last quiz
                  </div>
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
                  <p className="text-sm text-slate-500">Performance trends across quizzes</p>
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
              <ClassAverageChart />
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
                  <p className="text-sm text-slate-500">Average performance by concept area</p>
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
              <ConceptMasteryChart />
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
                  <p className="text-sm text-slate-500">Individual student scores</p>
                </div>
                <div className="bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800 px-2 py-1 rounded-full text-xs">
                  <span className="flex items-center">
                    <Users className="h-3 w-3 mr-1" />8 Students
                  </span>
                </div>
              </div>
            </div>
            <div className="p-3">
              <StudentPerformanceTable />
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
                  <p className="text-sm text-slate-500">Questions with highest error rates</p>
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
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">1</td>
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
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">2</td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                          Solving quadratic equations
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400">
                            65%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Calculation errors</td>
                      </tr>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">3</td>
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
                  <p className="text-sm text-slate-500">Students requiring intervention</p>
                </div>
                <div className="bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800 px-2 py-1 rounded-full text-xs">
                  <span className="flex items-center">
                    <Flag className="h-3 w-3 mr-1" />
                    5 Students
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
                    <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">Jamie Smith</span>
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
                    <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">Alex Johnson</span>
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
                    <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">Taylor Williams</span>
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
                  <p className="text-sm text-slate-500">AI-powered teaching suggestions</p>
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
                      <div className="font-medium text-slate-800 dark:text-slate-200 mb-1 text-sm">High Priority</div>
                      <p className="text-slate-600 dark:text-slate-400 text-xs">
                        Assign extra practice to the 5 students flagged for support on linear functions
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
                      <div className="font-medium text-slate-800 dark:text-slate-200 mb-1 text-sm">Medium Priority</div>
                      <p className="text-slate-600 dark:text-slate-400 text-xs">
                        Small group review session for quadratic equations and factoring
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
                      <div className="font-medium text-slate-800 dark:text-slate-200 mb-1 text-sm">Medium Priority</div>
                      <p className="text-slate-600 dark:text-slate-400 text-xs">
                        Class-wide review of graphing inequalities with interactive examples
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
  );
} 