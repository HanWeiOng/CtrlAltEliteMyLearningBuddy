"use client";

import { useState, useEffect } from "react";
import { Plus, Trash, Save } from "lucide-react";
import Sidebar from "../../components/ui/sidebar";
import Navbar from "../../components/ui/navbar";
import Popup from "../../components/ui/popup"; // Import the popup component

export default function CreateQuizPage() {
  const [selectedSubject, setSelectedSubject] = useState("Biology");
  const [selectedBanding, setSelectedBanding] = useState("Combined");
  const [selectedLevel, setSelectedLevel] = useState("O Level");
  const [questions, setQuestions] = useState<
    {
      id: number;
      question_text: string;
      answer_options: { option: string; text: object }[];
      image_paths?: string;
    }[]
  >([]);
  const [savedQuestions, setSavedQuestions] = useState<
    { question: string; options: string[]; id: number }[]
  >([]);
  const [fileName, setFileName] = useState("");
  
  // Popup states
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupTitle, setPopupTitle] = useState("");
  const [popupConfirmAction, setPopupConfirmAction] = useState<() => void>(() => {});

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
        setQuestions([]);
      }
    };
    fetchQuestions();
  }, [selectedSubject, selectedBanding, selectedLevel]);

  const addToFolder = (question: string, options: string[], id: number) => {
    if (!savedQuestions.some((q) => q.id === id)) {
      setSavedQuestions([...savedQuestions, { question, options, id }]); // Include the question id
    }
  };

  const removeFromFolder = (question: string) => {
    setSavedQuestions(savedQuestions.filter((q) => q.question !== question));
  };

  const showPopup = (title: string, message: string, confirmAction?: () => void) => {
    setPopupTitle(title);
    setPopupMessage(message);
    if (confirmAction) {
      setPopupConfirmAction(() => confirmAction);
    }
    setIsPopupOpen(true);
  };

  const saveQuestionsToFile = async () => {
    if (!fileName.trim()) {
      showPopup("Error", "Please enter a folder name.");
      return;
    }

    const questionIds = savedQuestions.map(q => q.id);

    const payload = {
      folder_name: fileName,
      question_ids: questionIds,
      subject: selectedSubject,
      banding: selectedBanding,
      level: selectedLevel
    };

    try {
      const response = await fetch("http://localhost:5003/api/createquiz/saveFolder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        showPopup("Success", "Folder saved successfully!", () => {
          window.location.reload();
        });
      } else {
        showPopup("Error", `Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error saving folder:", error);
      showPopup("Error", "Failed to save folder.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Navbar />

      <div className="flex flex-grow">
        <div className="w-1/5 p-4 bg-white shadow-md">
          <Sidebar setSelectedSubject={setSelectedSubject} />
        </div>

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
                        ? Object.entries(option.text).map(([key, value]) => (
                            <span key={key}>
                              {key}: {value},{" "}
                            </span>
                          ))
                        : option.text}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() =>
                    addToFolder(
                      q.question_text,
                      q.answer_options.map((option) =>
                        typeof option.text === "object"
                          ? JSON.stringify(option.text)
                          : option.text
                      ),
                      q.id
                    )
                  }
                  className="absolute top-3 right-3 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

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

          <div className="mt-6 border-t pt-4">
            <input
              type="text"
              placeholder="Enter file name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full p-2 border rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={saveQuestionsToFile}
              disabled={savedQuestions.length === 0}
              className="w-full flex items-center justify-center p-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5 mr-2" />
              Save Questions
            </button>
          </div>
        </div>
      </div>

      {/* Popup Component */}
      <Popup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        title={popupTitle}
        message={popupMessage}
        confirmText="OK"
        onConfirm={popupConfirmAction}
      />
    </div>
  );
}
