"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear session data
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