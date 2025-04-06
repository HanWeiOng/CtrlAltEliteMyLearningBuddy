"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface RoleRestrictionWrapperProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export default function RoleRestrictionWrapper({
  allowedRoles,
  children,
}: RoleRestrictionWrapperProps) {
  const router = useRouter();

  useEffect(() => {
    // Check if the user's position is stored in session storage
    const userPosition = localStorage.getItem("user_position");
    console.log("User Position:", userPosition);

    // If no position is set, redirect to practiceQuiz as a fallback
    if (!userPosition) {
      alert("No user position found. Redirecting to Practice Quiz.");
      router.replace("/practiceQuiz");
      return;
    }

    // If the user's position is not in the allowed roles, redirect to practiceQuiz
    if (!allowedRoles.includes(userPosition)) {
      alert("Access denied. Redirecting to Practice Quiz.");
      router.replace("/practiceQuiz");
      return;
    }
  }, [allowedRoles, router]);

  return <>{children}</>;
}