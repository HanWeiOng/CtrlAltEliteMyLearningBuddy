"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, FolderPlus, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { FolderActions } from "@/components/ui/folder-actions";

// Define types for our data
interface QuizFolder {
  id: number;
  folder_name: string;
  subject: string;
  banding: string;
  level: string;
  question_ids: number[];
  created_at: string;
  questionCount: number;
}

// interface Question {
//   id: number;
//   paper_name: string;
//   question_text: string;
//   answer_options: Array<{
//     option: string;
//     text: string | Record<string, string>;
//   }>;
//   image_paths: string | null;
//   answer_key: string;
//   subject: string;
//   banding: string;
//   level: string;
// }

const PracticeQuizPage: React.FC = () => {
  interface Student {
    account_id: number;
    username: string;
    assigned: boolean; // Indicates if the student is assigned
  }
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [activeFolder, setActiveFolder] = useState("All Documents");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [folders, setFolders] = useState<QuizFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAssignPopupOpen, setIsAssignPopupOpen] = useState(false);
  const [assignFolderId, setAssignFolderId] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<string | null>(null);
  const router = useRouter();

  // const [questions, setQuestions] = useState<Question[]>([])
  // const setQuestions = useRef<Question[]>
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedBanding, setSelectedBanding] = useState("")
  const [selectedLevel, setSelectedLevel] = useState("")
  // const selectedSubject = "";
  // const selectedBanding = "";
  // const selectedLevel = "";

  // Fetch folders when component mounts
  useEffect(() => {
    const storedSessionId = localStorage.getItem("session_id");
    const storedUserPosition = localStorage.getItem("user_position");

    if (!storedSessionId) {
      router.push("/login");
    } else {
      setSessionId(storedSessionId);
      setUserPosition(storedUserPosition);
    }
  }, [router]);

  useEffect(() => {
    if (sessionId) {
      fetchFolders();
    }
  }, [sessionId]);
  const fetchFolders = async () => {
    if (!sessionId) {
      console.error("Session ID is null or undefined");
      return;
    }

    try {
      setLoading(true);
      const queryParam =
        userPosition === "student"
          ? `studentId=${sessionId}`
          : `teacherId=${sessionId}`;

      const response = await fetch(
        `http://localhost:5003/api/openpracticequiz/getFolders?${queryParam}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch folders: ${response.statusText}`);
      }
      const data = await response.json();
      setFolders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch folders");
      console.error("Error fetching folders:", err);
    } finally {
      setLoading(false);
    }
  };

  // const fetchFilteredQuestions = async () => {
  //   if (!selectedSubject || !selectedBanding || !selectedLevel) {
  //     return;
  //   }

  //   try {
  //     setLoading(true)
  //     const response = await fetch(
  //       `${process.env.NEXT_PUBLIC_API_URL}/api/practiceQuiz/getQuestions?subject=${selectedSubject}&banding=${selectedBanding}&level=${selectedLevel}`
  //     )
  //     if (!response.ok) {
  //       throw new Error(`Failed to fetch questions: ${response.statusText}`)
  //     }
  //     const data = await response.json()
  //     setQuestions(data)
  //     setError(null)
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : 'Failed to fetch questions')
  //     console.error('Error fetching questions:', err)
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  // Get unique subjects from folders for the sidebar
  const uniqueSubjects = [
    "All Documents",
    ...new Set(folders.map((folder) => folder.subject)),
  ];

  // Filter folders based on search and active folder
  const filteredFolders = folders.filter((folder) => {
    const matchesFolder =
      activeFolder === "All Documents" || folder.subject === activeFolder;
    const matchesSearch = folder.folder_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setError("Folder name is required");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        "http://localhost:5003/api/openpracticequiz/saveQuiz",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "sharon001",
            folder_name: newFolderName,
            subject: selectedSubject || "General",
            banding: selectedBanding || "All",
            level: selectedLevel || "All",
            question_ids: [],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Failed to create folder: ${response.status} ${response.statusText}\n${errorData}`
        );
      }

      await fetchFolders(); // Refresh the folders list
      setShowNewFolderDialog(false);
      setNewFolderName("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
      console.error("Error creating folder:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (folderId: number) => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:5003/api/openpracticequiz/deleteFolder/${folderId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete folder");
      }

      await fetchFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete folder");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignFolder = async (folderId: number) => {
    try {
      setAssignFolderId(folderId);
      setIsAssignPopupOpen(true);
      setLoading(true); // Show loading state while fetching students

      const response = await fetch(
        `http://localhost:5003/api/openpracticequiz/getQuizAssigned/${folderId}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch students: ${response.statusText}`);
      }

      const data = await response.json();

      // Combine assigned and unassigned students into one list
      const allStudents = [
        ...data.assignedStudents.map((student: any) => ({
          ...student,
          assigned: true, // Mark as assigned
        })),
        ...data.unassignedStudents.map((student: any) => ({
          ...student,
          assigned: false, // Mark as unassigned
        })),
      ];

      setStudents(allStudents); // Update the students state
      setSelectedStudents(
        data.assignedStudents.map((student: any) => student.account_id) // Pre-select assigned students
      );
    } catch (err) {
      console.error("Error fetching students:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch students");
    } finally {
      setLoading(false); // Hide loading state after fetching
    }
  };
  const handleSelectAll = async (checked: boolean) => {
    setSelectAll(checked);

    if (checked) {
      // Select all students
      const allStudentIds = students.map((student) => student.account_id);

      // Filter out students who are already assigned
      const unassignedStudentIds = allStudentIds.filter(
        (studentId) => !selectedStudents.includes(studentId)
      );

      // Call the backend only for unassigned students
      await Promise.all(
        unassignedStudentIds.map(
          (studentId) => handleToggleStudent(studentId) // Pass `true` to indicate assigning
        )
      );

      // Update the state in bulk after all backend calls are completed
      setSelectedStudents(allStudentIds);
    } else {
      // Deselect all students
      const allStudentIds = selectedStudents; // Currently selected students

      // Call the backend for each student to unassign them
      await Promise.all(
        allStudentIds.map(
          (studentId) => handleToggleStudent(studentId) // Pass `false` to indicate unassigning
        )
      );

      // Clear the state in bulk after all backend calls are completed
      setSelectedStudents([]);
    }
  };

  const handleToggleStudent = async (studentId: number) => {
    const isCurrentlyAssigned = selectedStudents.includes(studentId);
    console.log(studentId);
    try {
      // Update the backend to assign or unassign the student
      const response = await fetch(
        "http://localhost:5003/api/openpracticequiz/assignQuiz",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_id: studentId,
            teacher_id: sessionId, // Use the sessionId as the teacher ID
            quiz_folder_id: assignFolderId, // Use the current folder ID
          }),
        }
      );
      console.log(response);

      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          `Error updating assignment for student ${studentId}:`,

          errorData
        );
        return;
      }

      // Update the local state based on the current assignment status
      if (isCurrentlyAssigned) {
        // If the student is currently assigned, unassign them
        setSelectedStudents(selectedStudents.filter((id) => id !== studentId));
      } else {
        // If the student is currently unassigned, assign them
        setSelectedStudents([...selectedStudents, studentId]);
      }
    } catch (error) {
      console.error("Error updating student assignment:", error);
    }
  };

  const handleShareFolder = (folderId: number) => {
    // Implement share functionality
    console.log("Sharing folder:", folderId);
  };

  const handleDownloadFolder = (folderId: number) => {
    // Implement download functionality
    console.log("Downloading folder:", folderId);
  };

  // Function to format the relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C3AED]"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              Loading...
            </span>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center text-red-600 dark:text-red-400">
            <p>{error}</p>
            <Button
              onClick={fetchFolders}
              className="mt-4 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Retry
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Practice Quiz
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage and organize your quiz folders
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2 rounded-lg border-[#7C3AED] dark:border-[#7C3AED] hover:bg-[#7C3AED]/10 dark:hover:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#7C3AED] transition-all duration-200"
              onClick={() => setShowNewFolderDialog(true)}
            >
              <FolderPlus className="h-4 w-4" />
              <span>New Folder</span>
            </Button>
            
            <Button onClick={() => router.push("/createQuiz")} className="gap-2 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white transition-all duration-200 shadow-sm hover:shadow-md">
              <Plus className="h-4 w-4" />
              <span>New Quiz</span>
            </Button>
       
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Subjects
              </h3>
              <ul className="space-y-1">
                {uniqueSubjects &&
                  uniqueSubjects.map((subject) => (
                    <li key={subject}>
                      <button
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                          activeFolder === subject
                            ? "bg-gradient-to-r from-[#7C3AED]/10 to-[#7C3AED]/20 dark:from-[#7C3AED]/20 dark:to-[#7C3AED]/30 text-[#7C3AED] dark:text-[#7C3AED] font-medium shadow-sm"
                            : "text-gray-700 dark:text-gray-300 hover:bg-[#7C3AED]/5 dark:hover:bg-[#7C3AED]/10"
                        }`}
                        onClick={() => setActiveFolder(subject)}
                      >
                        {subject}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="mb-6 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <Input
                  placeholder="Search quizzes..."
                  className="pl-10 py-2 bg-white dark:bg-gray-900 border-[#7C3AED] dark:border-[#7C3AED] rounded-lg focus:ring-2 focus:ring-[#7C3AED]/20 transition-all duration-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className="rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </Button>
              </div>
            </div>

            {filteredFolders.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  No quizzes found. Create a new folder to get started.
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200"
                  >
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[#7C3AED] dark:text-[#7C3AED]" />
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {folder.folder_name}
                        </h4>
                      </div>
                      <FolderActions
                        folderId={folder.id}
                        folderName={folder.folder_name}
                        onDelete={handleDeleteFolder}
                        onShare={handleShareFolder}
                        onDownload={handleDownloadFolder}
                        onAssign={handleAssignFolder}
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
                        <span>{folder.questionCount} questions</span>
                        <span>
                          Modified {getRelativeTime(folder.created_at)}
                        </span>
                      </div>
                      <Link href={`/practiceQuiz/${folder.id}`}>
                        <Button
                          variant="outline"
                          className="w-full rounded-lg border-[#7C3AED] dark:border-[#7C3AED] hover:bg-[#7C3AED]/10 dark:hover:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#7C3AED] transition-all duration-200"
                        >
                          Open Quiz
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Quiz Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Questions
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Last Modified
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredFolders.map((folder) => (
                      <tr
                        key={folder.id}
                        className="hover:bg-[#7C3AED]/5 dark:hover:bg-[#7C3AED]/10 transition-all duration-200"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-[#7C3AED] dark:text-[#7C3AED] mr-2" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {folder.folder_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                          {folder.questionCount}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                          {getRelativeTime(folder.created_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                          {folder.subject}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <FolderActions
                            folderId={folder.id}
                            folderName={folder.folder_name}
                            onDelete={handleDeleteFolder}
                            onShare={handleShareFolder}
                            onDownload={handleDownloadFolder}
                            onAssign={handleAssignFolder}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
      <Dialog open={isAssignPopupOpen} onOpenChange={setIsAssignPopupOpen}>
        <DialogContent className="bg-white dark:bg-gray-900 border-[#7C3AED] dark:border-[#7C3AED] rounded-xl max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              Assign Folder
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Select students to assign this folder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-96 overflow-y-auto">
            {/* Add Select All checkbox */}
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={
                  students.length > 0 &&
                  selectedStudents.length === students.length
                }
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4 w-4 text-[#7C3AED] border-gray-300 rounded focus:ring-[#7C3AED]"
              />
              <label className="ml-2 text-sm text-gray-900 dark:text-white">
                Select All
              </label>
            </div>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {students.map((student) => (
                  <tr
                    key={student.account_id}
                    className="hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <td className="px-4 py-2 text-gray-900 dark:text-white">
                      {student.username}
                    </td>
                    <td className="px-4 py-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(
                            student.account_id
                          )}
                          onChange={() =>
                            handleToggleStudent(student.account_id)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#7C3AED] dark:peer-focus:ring-[#7C3AED] rounded-full peer dark:bg-gray-700 peer-checked:bg-[#7C3AED]"></div>
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAssignPopupOpen(false)}
              className="rounded-lg border-[#7C3AED] dark:border-[#7C3AED] hover:bg-[#7C3AED]/10 dark:hover:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#7C3AED] transition-all duration-200"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="bg-white dark:bg-gray-900 border-[#7C3AED] dark:border-[#7C3AED] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              Create New Folder
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Create a new folder to organize your quizzes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Folder Name
            </label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="My Quiz Folder"
              className="rounded-lg border-[#7C3AED] dark:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all duration-200"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewFolderDialog(false)}
              className="rounded-lg border-[#7C3AED] dark:border-[#7C3AED] hover:bg-[#7C3AED]/10 dark:hover:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#7C3AED] transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              className="rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white transition-all duration-200 shadow-sm hover:shadow-md"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PracticeQuizPage;
