"use client";

import { useParams, useRouter } from "next/navigation"; // Import useRouter
import { useEffect, useState } from "react";
import Navbar from "@/components/ui/navbar"; // Import Navbar for consistency

interface Question {
  id: number;
  question_text: string;
  answer_options: { option: string; text: string | object }[];
  image_paths?: string;
}

export default function QuizDetailsPage() {
  const { folderId } = useParams(); // Get the folderId from the URL
  const router = useRouter(); // Initialize useRouter
  const [questions, setQuestions] = useState<Question[]>([]);
  const [folderName, setFolderName] = useState<string>(""); // State for folder name
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(
          `http://localhost:5003/api/practicequiz/getQuestionsByFolder/${folderId}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch questions");
        }

        const data = await response.json();
        setQuestions(data.questions); // Set the questions
        setFolderName(data.folderName); // Set the folder name
      } catch (error) {
        console.error("Error fetching questions:", error);
        setQuestions([]);
        setFolderName(""); // Reset folder name on error
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [folderId]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Navbar */}
      <Navbar />

      <main className="flex-grow p-6">
        <button
          onClick={() => router.push("/practiceQuiz")} // Navigate back to practice quiz
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Back to Practice Quiz
        </button>

        <h1 className="text-2xl font-bold mb-6">
          Quiz Questions for Folder: {folderName || "Loading..."}
        </h1>

        {loading ? (
          <p>Loading questions...</p>
        ) : questions.length === 0 ? (
          <p>No questions found for this folder.</p>
        ) : (
          <div className="space-y-6">
            {questions.map((q) => (
              <div
                key={q.id}
                className="p-4 border rounded-lg bg-white shadow relative"
              >
                <h2 className="text-lg font-medium">{q.question_text}</h2>
                {q.image_paths && (
                  <img
                    src={q.image_paths}
                    alt="Question Image"
                    className="mb-4 max-w-full"
                  />
                )}
                <ul className="mt-2 space-y-2">
                  {q.answer_options.map((option, i) => (
                    <li
                      key={i}
                      className="p-2 border rounded-md hover:bg-gray-100 cursor-pointer"
                    >
                      {option.option}:{" "}
                      {typeof option.text === "object"
                        ? Object.entries(option.text).map(([key, value]) => (
                            <span key={key}>
                              {key}: {value},{" "}
                            </span>
                          ))
                        : option.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}