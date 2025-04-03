"use client";

import { useEffect, useState } from "react";

const subjects = [
  "Biology",
  "Chemistry",
  "Physics",
  "Mathematics",
  "History",
  "English"
] as const;
const levels = ["PSLE", "Lower Secondary", "O Level", "N Level"] as const;

type Subject = (typeof subjects)[number];
type Level = (typeof levels)[number];
type Banding = string | null;

interface SidebarProps {
  updateFilters: (subject: Subject, banding: Banding, level: Level) => void;
}

export default function Sidebar({ updateFilters }: SidebarProps) {
  const [selectedSubject, setSelectedSubject] = useState<Subject>(subjects[0]);
  const [selectedBanding, setSelectedBanding] = useState<Banding>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level>(levels[0]);

  // 🔁 Get banding options dynamically
  const getBandingOptions = (): Banding[] => {
    if (
      selectedSubject === "Biology" ||
      selectedSubject === "Chemistry" ||
      selectedSubject === "Physics"
    ) {
      return ["Combined", "Pure"];
    }
    if (selectedSubject === "Mathematics") {
      if (selectedLevel === "PSLE") return ["Math"];
      return ["G1", "G2(E-Math)", "G2(A-Math)", "G3(E-Math)", "G3(A-Math)"];
    }
    // if (selectedSubject === "Science") {
    //   return ["N.A", "G1", "G2", "G3"];
    // }
    return [null];
  };

  const bandingOptions = getBandingOptions();

  // 🔁 Reset selectedBanding if not in options
  useEffect(() => {
    if (!bandingOptions.includes(selectedBanding)) {
      const fallback = bandingOptions[0] ?? null;
      setSelectedBanding(fallback);
      updateFilters(selectedSubject, fallback, selectedLevel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject, selectedLevel]);

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
            const newSubject = e.target.value as Subject;
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
          value={selectedBanding ?? "N.A"}
          onChange={(e) => {
            const value = e.target.value;
            const newBanding = value === "N.A" ? null : value;
            setSelectedBanding(newBanding);
            updateFilters(selectedSubject, newBanding, selectedLevel);
          }}
        >
          {bandingOptions.map((banding) => (
            <option key={banding ?? "N.A"} value={banding ?? "N.A"}>
              {banding === null || banding === "N.A" ? "N.A" : banding}
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
            const newLevel = e.target.value as Level;
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
