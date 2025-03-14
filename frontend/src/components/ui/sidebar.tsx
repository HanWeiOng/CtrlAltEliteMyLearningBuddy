"use client";

import { Dispatch, SetStateAction, useState } from "react";

const subjects = ["Biology", "Chemistry", "Mathematics", "History", "English"] as const;
const bandings = ["Combined", "Pure"] as const;
const levels = ["PSLE", "Lower Secondary", "O Level", "N Level"] as const;

interface SidebarProps {
  setSelectedSubject: Dispatch<SetStateAction<"Biology" | "Chemistry" | "Mathematics" | "History" | "English">>;
}

export default function Sidebar({ setSelectedSubject }: SidebarProps) {
  const [selectedSubject, setLocalSubject] = useState(subjects[0]);
  const [selectedBanding, setSelectedBanding] = useState(bandings[0]);
  const [selectedLevel, setSelectedLevel] = useState(levels[0]);

  const handleSubjectChange = (subject: string) => {
    if (subjects.includes(subject as any)) {
      setLocalSubject(subject as any);
      setSelectedSubject(subject as any);
    }
  };

  return (
    <div className="w-full p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-lg font-semibold mb-4">Filter Options</h2>

      {/* Subject Dropdown */}
      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-2">Select Subject</label>
        <select
          className="w-full p-2 border rounded-md"
          value={selectedSubject}
          onChange={(e) => handleSubjectChange(e.target.value)}
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
          onChange={(e) => setSelectedBanding(e.target.value as any)}
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
          onChange={(e) => setSelectedLevel(e.target.value as any)}
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
