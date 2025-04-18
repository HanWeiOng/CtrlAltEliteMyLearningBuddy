"use client";

import { useState, useRef } from "react";
import { Plus, Trash, Search } from "lucide-react";
import Image from "next/image";
import Sidebar from "../../components/ui/sidebar";
import Navbar from "../../components/ui/navbar";
import Popup from "../../components/ui/popup";
import QuizModal from "../../components/ui/quiz-modal";

export default function CreateQuizPage() {
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedBanding, setSelectedBanding] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateFilters = (
    subject: "Biology" | "Chemistry" | "Mathematics" | "History" | "English"|"Physics",
    banding: string | null,
    level: string
  ) => {
    setSelectedSubject(subject);
    setSelectedBanding(banding);
    setSelectedLevel(level);
  };

  const [userAnswers, setUserAnswers] = useState<{ [questionText: string]: string }>({});
  const [explanations, setExplanations] = useState<{ [questionText: string]: string }>({});
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

  // Popup states
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  // const [popupMessage, setPopupMessage] = useState("");
  // const [popupTitle, setPopupTitle] = useState("");
  const popupMessage=""
  const popupTitle=""
  const popupConfirmActionRef = useRef<() => void>(() => {});

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

  const addToFolder = (
    id: number,
    question: string,
    options: readonly string[]
  ) => {
    if (!savedQuestions.some((q) => q.id === id)) {
      setSavedQuestions([...savedQuestions, { id, question, options: [...options] }]);
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

    setUserAnswers((prev) => ({
      ...prev,
      [questionText]: selectedOption,
    }));

    const selectedOptionTextObj = answerOptions.find((opt) => opt.option === selectedOption);
    const correctOptionTextObj = answerOptions.find((opt) => opt.option === correctAnswer);

    const userAnswerText =
      typeof selectedOptionTextObj?.text === "object"
        ? JSON.stringify(selectedOptionTextObj?.text)
        : selectedOptionTextObj?.text;

    const correctAnswerText =
      typeof correctOptionTextObj?.text === "object"
        ? JSON.stringify(correctOptionTextObj?.text)
        : correctOptionTextObj?.text;

    if (selectedOption === correctAnswer) {
      setExplanations((prev) => ({
        ...prev,
        [questionText]: "✅ Correct! Great job!",
      }));
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:5003/api/createquiz/postWrongAnswer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: questionText,
            userAnswer: {
              option: selectedOption,
              text: userAnswerText,
            },
            correctAnswer: {
              option: correctAnswer,
              text: correctAnswerText,
            },
            options: answerOptions,
            imageUrl,
          }),
        }
      );

      const data = await res.json();
      setExplanations((prev) => ({
        ...prev,
        [questionText]: res.ok
          ? data.explanation
          : "❌ Incorrect — but Gemini couldn&apos;t explain why.",
      }));
    } catch (error) {
      console.error("Error explaining wrong answer:", error);
      setExplanations((prev) => ({
        ...prev,
        [questionText]: "⚠️ Something went wrong. Please try again.",
      }));
    }
  };

  const handleCreateQuiz = async (quizName: string) => {
    try {
      setIsSaving(true);
      const questionIds = savedQuestions.map((q) => q.id);

      const response = await fetch(
        `http://localhost:5003/api/openpracticequiz/saveQuiz`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "sharon001",
            folder_name: quizName,
            subject: selectedSubject,
            banding: selectedBanding,
            level: selectedLevel,
            question_ids: questionIds,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to save quiz: ${response.status} ${response.statusText}\n${errorData}`);
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
          <Sidebar updateFilters={updateFilters} />
          <div className="mt-4 flex justify-end">
            <button
              onClick={fetchQuestions}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
            >
              <Search className="w-4 h-4 mr-2" />
              Filter Questions
            </button>
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className="mb-4">
            <h1 className="text-2xl font-semibold">MCQ Questions - {selectedSubject}</h1>
          </div>
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-gray-600">Loading questions...</span>
              </div>
            ) : questions.length > 0 ? (
              questions.map((q) => (
                <div key={q.id} className="p-4 border rounded-lg bg-white shadow relative">
                  <h2 className="text-lg font-medium">{q.question_text}</h2>
                  {q.image_paths && (
                    <div className="relative w-full h-64 mb-4">
                      <Image
                        src={q.image_paths}
                        alt="Question Image"
                        layout="fill"
                        objectFit="contain"
                      />
                    </div>
                  )}
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
                                : isSelected && !isCorrect
                                ? "bg-red-100 border-red-500"
                                : "opacity-50 cursor-not-allowed"
                              : "hover:bg-gray-100"
                          }`}
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
                      );
                    })}
                  </ul>

                  {explanations[q.question_text] && (
                    <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-600 text-yellow-900 rounded shadow-sm whitespace-pre-line">
                      <div className="font-semibold mb-1">🧠 Tutor&apos;s Explanation:</div>
                      <div>{explanations[q.question_text]}</div>
                    </div>
                  )}

                  <button
                    onClick={() =>
                      addToFolder(
                        q.id,
                        q.question_text,
                        q.answer_options.map((opt) => opt.option)
                      )
                    }
                    className="absolute top-3 right-3 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  No questions available. Click &quot;Filter Questions&quot; to load questions.
                </p>
              </div>
            )}
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
                    onClick={() => removeFromFolder(q.id)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
              >
                Create Quiz
              </button>
            </div>
          ) : (
            <p className="text-gray-500">No questions saved.</p>
          )}
        </div>
      </div>

      <Popup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        title={popupTitle}
        message={popupMessage}
        confirmText="OK"
        onConfirm={() => popupConfirmActionRef.current()}
      />

      <QuizModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateQuiz}
        savedQuestions={[]}
        isSaving={isSaving}
      />
    </div>
  );
}
