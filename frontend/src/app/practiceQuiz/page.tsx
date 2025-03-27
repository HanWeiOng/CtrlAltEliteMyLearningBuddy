"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/navbar"; // Import the Navbar component

interface QuizFolder {
  id: number;
  username: string;
  folder_name: string;
  subject: string;
  banding: string | null;
  level: string;
  question_ids: number[];
  created_at: string;
}

export default function PracticeQuizPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<QuizFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(""); // State for search query

  // Fetch data from the API
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const response = await fetch(
          "http://localhost:5003/api/practicequiz/getQuizFolders"
        );
        if (!response.ok) {
          throw new Error("Failed to fetch folders");
        }
        const data = await response.json();
        setFolders(data);
      } catch (error) {
        console.error("Error fetching folders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFolders();
  }, []);

  // Filter folders based on the search query
  const filteredFolders = folders.filter((folder) =>
    folder.folder_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <Navbar />

      <div className="flex flex-grow">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-100 p-6">
          <h2 className="text-xl font-bold mb-6">Folders</h2>
          <ul>
            <li className="mb-2">
              <button className="text-blue-600 hover:text-blue-800 focus:outline-none">
                All Documents
              </button>
            </li>
            <li className="mb-2">
              <button className="text-blue-600 hover:text-blue-800 focus:outline-none">
                Mathematics
              </button>
            </li>
            <li className="mb-2">
              <button className="text-blue-600 hover:text-blue-800 focus:outline-none">
                Science
              </button>
            </li>
            <li className="mb-2">
              <button className="text-blue-600 hover:text-blue-800 focus:outline-none">
                Shared with Me
              </button>
            </li>
            <li className="mb-2">
              <button className="text-blue-600 hover:text-blue-800 focus:outline-none">
                Recent
              </button>
            </li>
          </ul>
        </aside>

        {/* Main Content */}
        <main className="flex-grow p-6 bg-white">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">My Documents</h1>
            <div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md mr-4 hover:bg-blue-700">
                New Folder
              </button>
              <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
                New Document
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              className="border rounded-lg px-4 py-2 w-full"
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} // Update search query dynamically
            />
          </div>

          {/* Document Cards */}
          {loading ? (
            <p>Loading folders...</p>
          ) : filteredFolders.length === 0 ? (
            <p>No folders found matching your search.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow bg-gray-50"
                >
                  <h3 className="font-medium text-lg">{folder.folder_name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {folder.subject} {folder.banding && `• ${folder.banding}`} •{" "}
                    {folder.level}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Modified {new Date(folder.created_at).toLocaleDateString()} •{" "}
                    {folder.question_ids.length} questions
                  </p>
                  <button
                    className="mt-4 bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
                    onClick={() => router.push(`/practiceQuiz/${folder.id}`)} // Navigate to folder-specific page
                  >
                    Open Quiz
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}