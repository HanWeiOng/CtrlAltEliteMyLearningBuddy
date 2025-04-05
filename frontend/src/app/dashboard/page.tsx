import React from "react";

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Summary Card */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Your Progress</h2>
          <div className="space-y-3">
            <p className="text-gray-600">Quizzes completed: <span className="font-medium">12</span></p>
            <p className="text-gray-600">Average score: <span className="font-medium">85%</span></p>
          </div>
        </div>
        
        {/* Recent Activity Card */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <p className="text-gray-600">OCR Document Uploaded</p>
              <p className="text-gray-400 text-sm">2 days ago</p>
            </div>
            <div className="flex justify-between">
              <p className="text-gray-600">Quiz Completed</p>
              <p className="text-gray-400 text-sm">5 days ago</p>
            </div>
          </div>
        </div>
        
        {/* Quick Actions Card */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg transition">
              Create New Quiz
            </button>
            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition">
              Practice Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 