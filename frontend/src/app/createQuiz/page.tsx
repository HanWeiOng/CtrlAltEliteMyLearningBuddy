"use client";

import { useState } from "react";
import { Plus, Trash } from "lucide-react";
import Sidebar from "../../components/ui/sidebar";
import Navbar from "../../components/ui/navbar";

// Dummy MCQ Data
const questionsData = {
    Biology: [
        { question: "What is the powerhouse of the cell?", options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi apparatus"], answer: "Mitochondria" },
        { question: "What is the function of red blood cells?", options: ["Carry oxygen", "Digest food", "Produce hormones", "Filter blood"], answer: "Carry oxygen" },
    ],
    Chemistry: [
        { question: "What is the chemical formula for water?", options: ["H2O", "O2", "CO2", "NaCl"], answer: "H2O" },
        { question: "What gas is released when an acid reacts with a metal?", options: ["Oxygen", "Carbon dioxide", "Hydrogen", "Nitrogen"], answer: "Hydrogen" },
    ],
    Mathematics: [
        { question: "What is 2 + 2?", options: ["3", "4", "5", "6"], answer: "4" },
        { question: "Solve for x: 2x = 10", options: ["2", "5", "10", "20"], answer: "5" },
    ],
    History: [
        { question: "Who was the first President of the United States?", options: ["Abraham Lincoln", "George Washington", "Thomas Jefferson", "John Adams"], answer: "George Washington" },
        { question: "Which war ended in 1945?", options: ["World War I", "Cold War", "World War II", "Vietnam War"], answer: "World War II" },
    ],
    English: [
        { question: "What is the synonym of 'Happy'?", options: ["Sad", "Excited", "Joyful", "Angry"], answer: "Joyful" },
        { question: "Which of these is a noun?", options: ["Run", "Beautiful", "Happiness", "Quickly"], answer: "Happiness" },
    ],
} as const;


export default function CreateQuizPage() {
    const [selectedSubject, setSelectedSubject] = useState<keyof typeof questionsData>("Biology");
    const [savedQuestions, setSavedQuestions] = useState<{ question: string; options: string[] }[]>([]);

    // Add Question to Folder
    const addToFolder = (question: string, options: readonly string[]) => {
        if (!savedQuestions.some((q) => q.question === question)) {
          setSavedQuestions([...savedQuestions, { question, options: [...options] }]); // ✅ Convert readonly array to mutable
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
            <h1 className="text-2xl font-semibold mb-4">MCQ Questions - {selectedSubject}</h1>
            <div className="space-y-6">
                {questionsData[selectedSubject].map((q, index) => (
                <div key={index} className="p-4 border rounded-lg bg-white shadow relative">
                    <h2 className="text-lg font-medium">{q.question}</h2>
                    <ul className="mt-2 space-y-2">
                    {q.options.map((option, i) => (
                        <li key={i} className="p-2 border rounded-md hover:bg-gray-100 cursor-pointer">
                        {option}
                        </li>
                    ))}
                    </ul>
                    {/* Add to Folder Button */}
                    <button onClick={() => addToFolder(q.question, q.options)} className="absolute top-3 right-3 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition">
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
                    <div key={index} className="p-3 border rounded-lg bg-gray-50 relative">
                    <p className="font-medium">{q.question}</p>
                    <button onClick={() => removeFromFolder(q.question)} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition">
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
