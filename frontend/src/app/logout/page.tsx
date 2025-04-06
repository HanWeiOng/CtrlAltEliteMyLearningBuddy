"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear session data
    const userPosition = localStorage.getItem("user_position");
    console.log("User Position:", userPosition);
    localStorage.removeItem("session_id");
    localStorage.removeItem("user_position");

    // Redirect to login page
    router.push("/login");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Logging out...</p>
    </div>
  );
}