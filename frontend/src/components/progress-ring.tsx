"use client"

import React, { useEffect, useState } from 'react';

interface ProgressRingProps {
  value: number;
  displayValue?: number; // New parameter to show whole numbers
  size?: number;
  strokeWidth?: number;
  color?: string;
  textColor?: string;
  label?: React.ReactNode;
}

export function ProgressRing({
  value,
  displayValue,
  size = 60,
  strokeWidth = 6,
  color = "#6366f1", // Default color is indigo
  textColor = "#6366f1",
  label,
}: ProgressRingProps) {
  const [progress, setProgress] = useState(0);

  // Animation effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(value);
    }, 100);

    return () => clearTimeout(timer);
  }, [value]);

  // Calculate the circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  // Display value (default to progress if not provided)
  const displayNumber = displayValue !== undefined ? displayValue : Math.round(progress);
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          className="dark:opacity-15 opacity-25"
        />

        {/* Foreground circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease-in-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold" style={{ color: textColor }}>
            {displayNumber}%
          </div>
          {label && <div className="text-xs text-slate-500">{label}</div>}
        </div>
      </div>
    </div>
  );
} 