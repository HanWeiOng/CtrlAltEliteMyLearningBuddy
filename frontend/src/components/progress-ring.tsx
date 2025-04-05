"use client"

import React, { useEffect, useState } from 'react';

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  textColor?: string;
  label?: React.ReactNode;
}

export function ProgressRing({
  value,
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
          className="opacity-25"
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
            {progress}%
          </div>
          {label && <div className="text-xs text-slate-500">{label}</div>}
        </div>
      </div>
    </div>
  );
} 