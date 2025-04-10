"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FileText,
  Edit,
  BookOpen,
  LayoutDashboard,
  FilePlus,
  LogOut,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname(); // Get current page path
  const [role, setRole] = useState<string | null>(null);

  // Get user role from localStorage after client renders
  useEffect(() => {
    const storedRole = localStorage.getItem("user_position");
    setRole(storedRole);
  }, []);

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    { name: "OCR", href: "/ocr", icon: <FileText className="w-5 h-5" /> },
    {
      name: "Create Quiz",
      href: "/createQuiz",
      icon: <Edit className="w-5 h-5" />,
    },
    {
      name: "Your Quizzes",
      href: "/practiceQuiz",
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      name: "Insert Syllabus",
      href: "/insertSyllabus",
      icon: <FilePlus className="w-5 h-5" />,
    },
  ];

  // Check if the current route is the homepage or login page
  const isMinimalPage = pathname === "/" || pathname === "/login";

  return (
    <nav className="flex items-center justify-between p-4 bg-white shadow-md">
      {/* Logo */}
      <Link href="" className="flex items-center gap-2 text-xl font-bold">
        <LayoutDashboard className="w-6 h-6 text-purple-500" />
        <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-transparent bg-clip-text">
          MyLearningBuddy
        </span>
      </Link>

      {/* Navigation Links (hidden on minimal pages) */}
      {!isMinimalPage && (
        <div className="flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href; // Check if current page matches

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  isActive
                    ? "bg-purple-100 text-purple-600 font-semibold"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                <div className={isActive ? "text-purple-600" : "text-gray-500"}>
                  {item.icon}
                </div>
                {item.name}
              </Link>
            );
          })}

          {/* Logout Icon */}
          <Link
            href="/logout"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:text-red-600 transition"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </Link>
        </div>
      )}
    </nav>
  );
}