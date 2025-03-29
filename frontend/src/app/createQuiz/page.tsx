"use client";

import { useState, useEffect } from "react";
import { Plus, Trash, Save, Search } from "lucide-react";
import Sidebar from "../../components/ui/sidebar";
import Navbar from "../../components/ui/navbar";
import Popup from "../../components/ui/popup";
import QuizModal from "../../components/ui/quiz-modal";

export default function CreateQuizPage() {
  const [selectedSubject, setSelectedSubject] = useState<
    "Biology" | "Chemistry" | "Mathematics" | "History" | "English"
  >("Biology");
  const [selectedBanding, setSelectedBanding] = useState("Combined");
  const [selectedLevel, setSelectedLevel] = useState("O Level");

  const [questions, setQuestions] = useState<
    {
      id: number;
      question_text: string;
      answer_key: string;
      answer_options: { option: string; text: object | string }[];
      image_paths?: string;
    }[]
  >([]);

  const [savedQuestions, setSavedQuestions] = useState<
    { id: number; question: string; options: string[] }[]
  >([]);

  const [userAnswers, setUserAnswers] = useState<{ [questionText: string]: string }>({});
  const [explanations, setExplanations] = useState<{ [questionText: string]: string }>({});
  const [fileName, setFileName] = useState("");

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupTitle, setPopupTitle] = useState("");
  const [popupConfirmAction, setPopupConfirmAction] = useState<() => void>(() => {});
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchQuestions = async () => {
    setIsLoading(true);
    setUserAnswers({});
    setExplanations({});
    try {
      const response = await fetch(
        `http://localhost:5003/api/createquiz/getQuestions?subject=${selectedSubject}&banding=${selectedBanding}&level=${selectedLevel}`
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setQuestions(data);
    } catch (error) {
      console.error("Error fetching questions:", error);
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [selectedSubject, selectedBanding, selectedLevel]);

  const addToFolder = (id: number, question: string, options: string[]) => {
    if (!savedQuestions.some((q) => q.id === id)) {
      setSavedQuestions([...savedQuestions, { id, question, options }]);
    }
  };

  const removeFromFolder = (id: number) => {
    setSavedQuestions(savedQuestions.filter((q) => q.id !== id));
  };

  const selectOption = async (
    questionText: string,
    selectedOption: string,
    correctAnswer: string,
    answerOptions: { option: string; text: object | string }[],
    imageUrl?: string
  ) => {
    if (userAnswers[questionText]) return;

    setUserAnswers((prev) => ({ ...prev, [questionText]: selectedOption }));

    const selectedText = answerOptions.find((opt) => opt.option === selectedOption)?.text;
    const correctText = answerOptions.find((opt) => opt.option === correctAnswer)?.text;

    const selectedTextStr = typeof selectedText === "object" ? JSON.stringify(selectedText) : selectedText;
    const correctTextStr = typeof correctText === "object" ? JSON.stringify(correctText) : correctText;

    if (selectedOption === correctAnswer) {
      setExplanations((prev) => ({
        ...prev,
        [questionText]: "✅ Correct! Great job!",
      }));
    } else {
      try {
        const res = await fetch("http://localhost:5003/api/createquiz/postWrongAnswer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: questionText,
            userAnswer: { option: selectedOption, text: selectedTextStr },
            correctAnswer: { option: correctAnswer, text: correctTextStr },
            options: answerOptions,
            imageUrl,
          }),
        });

        const data = await res.json();
        setExplanations((prev) => ({
          ...prev,
          [questionText]: res.ok ? data.explanation : "❌ Incorrect — but Gemini couldn't explain why.",
        }));
      } catch (err) {
        setExplanations((prev) => ({
          ...prev,
          [questionText]: "⚠️ Something went wrong. Please try again.",
        }));
      }
    }
  };

  const showPopup = (title: string, message: string, confirmAction?: () => void) => {
    setPopupTitle(title);
    setPopupMessage(message);
    if (confirmAction) setPopupConfirmAction(() => confirmAction);
    setIsPopupOpen(true);
  };

  const saveQuestionsToFile = async () => {
    if (!fileName.trim()) {
      showPopup("Error", "Please enter a folder name.");
      return;
    }

    const payload = {
      folder_name: fileName,
      question_ids: savedQuestions.map((q) => q.id),
      subject: selectedSubject,
      banding: selectedBanding,
      level: selectedLevel,
    };

    try {
      const response = await fetch("http://localhost:5003/api/createquiz/saveFolder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        showPopup("Success", "Folder saved successfully!", () => window.location.reload());
      } else {
        showPopup("Error", `Error: ${data.error}`);
      }
    } catch (error) {
      showPopup("Error", "Failed to save folder.");
    }
  };

  const handleCreateQuiz = async (quizName: string, description: string) => {
    setIsSaving(true);
    try {
      const response = await fetch("http://localhost:5003/api/practiceQuiz/saveQuiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "sharon001",
          folder_name: quizName,
          subject: selectedSubject,
          banding: selectedBanding,
          level: selectedLevel,
          question_ids: savedQuestions.map((q) => q.id),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save quiz: ${errorText}`);
      }

      await response.json();
      setSavedQuestions([]);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving quiz:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex flex-grow">
        <div className="w-1/5 p-4 bg-white shadow-md">
          <Sidebar setSelectedSubject={setSelectedSubject} />
          <div className="mt-4 flex justify-end">
            <button
              onClick={fetchQuestions}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              <Search className="w-4 h-4 mr-2" />
              Filter Questions
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 space-y-6">
          <h1 className="text-2xl font-semibold">MCQ Questions - {selectedSubject}</h1>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
              <span className="ml-3 text-gray-600">Loading questions...</span>
            </div>
          ) : questions.length > 0 ? (
            questions.map((q) => (
              <div key={q.id} className="p-4 border rounded-lg bg-white shadow relative">
                <h2 className="text-lg font-medium">{q.question_text}</h2>
                {q.image_paths && <img src={q.image_paths} alt="" className="mb-4 max-w-full" />}
                <ul className="mt-2 space-y-2">
                  {q.answer_options.map((option, i) => {
                    const isSelected = userAnswers[q.question_text] === option.option;
                    const isCorrect = q.answer_key === option.option;
                    const hasAnswered = !!userAnswers[q.question_text];

                    return (
                      <li
                        key={i}
                        onClick={() =>
                          !hasAnswered &&
                          selectOption(
                            q.question_text,
                            option.option,
                            q.answer_key,
                            q.answer_options,
                            q.image_paths
                          )
                        }
                        className={`p-2 border rounded-md cursor-pointer transition ${
                          hasAnswered
                            ? isSelected && isCorrect
                              ? "bg-green-100 border-green-500"
                              : isSelected
                              ? "bg-red-100 border-red-500"
                              : "opacity-50 cursor-not-allowed"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        {option.option}:{" "}
                        {typeof option.text === "object"
                          ? Object.entries(option.text).map(([k, v]) => `${k}: ${v}, `)
                          : option.text}
                      </li>
                    );
                  })}
                </ul>

                {explanations[q.question_text] && (
                  <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-600 text-yellow-900 rounded shadow-sm whitespace-pre-line">
                    <div className="font-semibold mb-1">🧠 Tutor's Explanation:</div>
                    {explanations[q.question_text]}
                  </div>
                )}

                <button
                  onClick={() =>
                    addToFolder(
                      q.id,
                      q.question_text,
                      q.answer_options.map((opt) =>
                        typeof opt.text === "object" ? JSON.stringify(opt.text) : opt.text
                      )
                    )
                  }
                  className="absolute top-3 right-3 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No questions available. Click "Filter Questions".</p>
          )}
        </div>

        <div className="w-1/4 p-4 bg-white shadow-md">
          <h2 className="text-xl font-semibold mb-4">Saved Questions</h2>
          {savedQuestions.length > 0 ? (
            <div className="space-y-4">
              {savedQuestions.map((q) => (
                <div key={q.id} className="p-3 border rounded-lg bg-gray-50 relative">
                  <p className="font-medium">{q.question}</p>
                  <button
                    onClick={() => removeFromFolder(q.id)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Create Quiz
              </button>
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
              className="w-full p-2 border rounded-md mb-3"
            />
            <button
              onClick={saveQuestionsToFile}
              disabled={savedQuestions.length === 0}
              className="w-full flex items-center justify-center p-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5 mr-2" />
              Save Questions
            </button>
          </div>
        </div>
      </div>

      <Popup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        title={popupTitle}
        message={popupMessage}
        confirmText="OK"
        onConfirm={popupConfirmAction}
      />

      <QuizModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateQuiz}
        isSaving={isSaving}
      />
    </div>
  );
}
