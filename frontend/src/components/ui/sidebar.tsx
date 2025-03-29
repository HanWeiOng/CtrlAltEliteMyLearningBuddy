"use client";

import { Dispatch, SetStateAction, useState } from "react";

const subjects = ["Biology", "Chemistry", "Mathematics", "History", "English"] as const;
const bandings = ["Combined", "Pure"] as const;
const levels = ["PSLE", "Lower Secondary", "O Level", "N Level"] as const;
interface SidebarProps {
  updateFilters: (
    subject: "Biology" | "Chemistry" | "Mathematics" | "History" | "English",
    banding: typeof bandings[number],
    level: typeof levels[number]
  ) => void;
}

export default function Sidebar({ updateFilters }: SidebarProps) {
  const [selectedSubject, setSelectedSubject] = useState<typeof subjects[number]>(subjects[0]);
  const [selectedBanding, setSelectedBanding] = useState<typeof bandings[number]>(bandings[0]);
  const [selectedLevel, setSelectedLevel] = useState<typeof levels[number]>(levels[0]);

  /*
  const handleSubjectChange = (subject: string) => {
    if (subjects.includes(subject as any)) {
      setLocalSubject(subject as any);
      setSelectedSubject(subject as any);
    }
  };
  */


  return (
    <div className="w-full p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-lg font-semibold mb-4">Filter Options</h2>

      {/* Subject Dropdown */}
      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-2">Select Subject</label>
        <select
          className="w-full p-2 border rounded-md"
          value={selectedSubject}
          onChange={(e) => {
            const newSubject = e.target.value as typeof subjects[number];
            setSelectedSubject(newSubject);
            updateFilters(newSubject, selectedBanding, selectedLevel);
          }}
        >
          {subjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </div>

      {/* Banding Dropdown */}
      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-2">Select Banding</label>
        <select
          className="w-full p-2 border rounded-md"
          value={selectedBanding}
          onChange={(e) => {
            const newBanding = e.target.value as typeof bandings[number];
            setSelectedBanding(newBanding);
            updateFilters(selectedSubject, newBanding, selectedLevel);
          }}
        >
          {bandings.map((banding) => (
            <option key={banding} value={banding}>
              {banding}
            </option>
          ))}
        </select>
      </div>

      {/* Level Dropdown */}
      <div>
        <label className="block text-gray-700 font-medium mb-2">Select Level</label>
        <select
          className="w-full p-2 border rounded-md"
          value={selectedLevel}
          onChange={(e) => {
            const newLevel = e.target.value as typeof levels[number];
            setSelectedLevel(newLevel);
            updateFilters(selectedSubject, selectedBanding, newLevel);
          }}
        >
          {levels.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
