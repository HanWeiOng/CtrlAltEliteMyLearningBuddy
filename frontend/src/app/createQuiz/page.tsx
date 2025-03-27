"use client";

import { useState, useEffect } from "react";
import { Plus, Trash } from "lucide-react";
import Sidebar from "../../components/ui/sidebar";
import Navbar from "../../components/ui/navbar";

export default function CreateQuizPage() {
  const [selectedSubject, setSelectedSubject] = useState("Biology"); // Initialize as string
  const [selectedBanding, setSelectedBanding] = useState("Combined"); // Initialize as string
  const [selectedLevel, setSelectedLevel] = useState("O Level"); // Initialize as string
  const [questions, setQuestions] = useState<
    {
      question_text: string;
      answer_options: { option: string; text: object }[];
      image_paths?: string;
    }[]
  >([]);
  const [savedQuestions, setSavedQuestions] = useState<
    { question: string; options: string[] }[]
  >([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(
          `http://localhost:5003/api/createquiz/getQuestions?subject=${selectedSubject}&banding=${selectedBanding}&level=${selectedLevel}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(data);
        setQuestions(data);
      } catch (error) {
        console.error("Error fetching questions:", error);
        // Handle error appropriately (e.g., show an error message to the user)
        setQuestions([])
      }
    };
    setQuestions([]);
    fetchQuestions();
  }, [selectedSubject, selectedBanding, selectedLevel]); // Re-fetch when these change

  // Add Question to Folder
  const addToFolder = (question: string, options: readonly string[]) => {
    if (!savedQuestions.some((q) => q.question === question)) {
      setSavedQuestions([
        ...savedQuestions,
        { question, options: [...options] },
      ]); // ✅ Convert readonly array to mutable
    }
  };

  // Remove Question from Folder
  const removeFromFolder = (question: string) => {
    setSavedQuestions(savedQuestions.filter((q) => q.question !== question));
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Navbar at the top */}
      <Navbar />

      <div className="flex flex-grow">
        {/* Left Sidebar */}
        <div className="w-1/5 p-4 bg-white shadow-md">
          <Sidebar setSelectedSubject={setSelectedSubject} />
        
        </div>

        {/* Middle - MCQ Questions */}
        <div className="flex-1 p-6">
          <h1 className="text-2xl font-semibold mb-4">
            MCQ Questions - {selectedSubject}
          </h1>
          <div className="space-y-6">
            {questions.map((q, index) => (
              <div
                key={index}
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
                        ? // Handle object case (if you still need to handle the first image case)
                          option.text &&
                          Object.entries(option.text).map(([key, value]) => (
                            <span key={key}>
                              {key}: {value},
                            </span>
                          ))
                        : // Handle string case
                          option.text}
                    </li>
                  ))}
                </ul>
                {/* Add to Folder Button */}
                <button
                  onClick={() => addToFolder(q.question_text, q.answer_option)}
                  className="absolute top-3 right-3 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right - Saved Folder */}
        <div className="w-1/4 p-4 bg-white shadow-md">
          <h2 className="text-xl font-semibold mb-4">Saved Questions</h2>
          {savedQuestions.length > 0 ? (
            <div className="space-y-4">
              {savedQuestions.map((q, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg bg-gray-50 relative"
                >
                  <p className="font-medium">{q.question}</p>
                  <button
                    onClick={() => removeFromFolder(q.question)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No questions saved.</p>
          )}
        </div>
      </div>
    </div>
  );
}
