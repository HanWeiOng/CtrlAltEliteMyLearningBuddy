"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Book, Download, FileText, FolderPlus, MoreHorizontal, Plus, Search, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Sample documents data
const sampleDocuments = [
  {
    id: "doc1",
    title: "Algebra Midterm Exam",
    questionCount: 15,
    lastModified: "2 days ago",
    folder: "Mathematics",
  },
  {
    id: "doc2",
    title: "Calculus Final Exam",
    questionCount: 20,
    lastModified: "1 week ago",
    folder: "Mathematics",
  },
  {
    id: "doc3",
    title: "Statistics Quiz",
    questionCount: 10,
    lastModified: "3 days ago",
    folder: "Mathematics",
  },
  {
    id: "doc4",
    title: "Geometry Practice Problems",
    questionCount: 12,
    lastModified: "Yesterday",
    folder: "Mathematics",
  },
  {
    id: "doc5",
    title: "Physics Mechanics Test",
    questionCount: 18,
    lastModified: "5 days ago",
    folder: "Science",
  },
  {
    id: "doc6",
    title: "Chemistry Lab Questions",
    questionCount: 8,
    lastModified: "2 weeks ago",
    folder: "Science",
  },
]

// Sample folders
const sampleFolders = ["All Documents", "Mathematics", "Science", "Shared with Me", "Recent"]

export default function DocumentsPage() {
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [activeFolder, setActiveFolder] = useState("All Documents")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const filteredDocuments = sampleDocuments.filter((doc) => {
    const matchesFolder = activeFolder === "All Documents" || doc.folder === activeFolder
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFolder && matchesSearch
  })

  const handleCreateFolder = () => {
    // Logic to create a new folder
    console.log("Creating folder:", newFolderName)
    setShowNewFolderDialog(false)
    setNewFolderName("")
    // In a real app, you would add this folder to your state
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <header className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Book className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">EduContent</h1>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">My Documents</h2>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2 rounded-full" onClick={() => setShowNewFolderDialog(true)}>
              <FolderPlus className="h-4 w-4" />
              <span>New Folder</span>
            </Button>
            <Button className="gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500">
              <Plus className="h-4 w-4" />
              <span>New Document</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Folders</h3>
              <ul className="space-y-1">
                {sampleFolders.map((folder) => (
                  <li key={folder}>
                    <button
                      className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${
                        activeFolder === folder
                          ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 font-medium"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                      onClick={() => setActiveFolder(folder)}
                    >
                      {folder}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="mb-6 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  className="pl-12 py-6 bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
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
                  className="rounded-full"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
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

            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">{doc.title}</h4>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem>
                            <Share2 className="mr-2 h-4 w-4" />
                            <span>Share</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            <span>Download PDF</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 dark:text-red-400">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
                        <span>{doc.questionCount} questions</span>
                        <span>Modified {doc.lastModified}</span>
                      </div>
                      <Button variant="outline" className="w-full rounded-full">
                        Open
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Document
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Questions
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Last Modified
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Folder
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
                            <span className="font-medium text-gray-900 dark:text-white">{doc.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                          {doc.questionCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                          {doc.lastModified}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">{doc.folder}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem>
                                <Share2 className="mr-2 h-4 w-4" />
                                <span>Share</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                <span>Download PDF</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 dark:text-red-400">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Create New Folder</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Create a new folder to organize your documents.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Folder Name</label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="My Folder"
              className="rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)} className="rounded-full">
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              className="rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}



// write 3 HTTP requests
// 1.1 display all docs, write GET request to endpt localhost:5000/practiceQuiz/
// 1.2 display images for these docs by calling s3 bucket route
// 2.1 display filtered questions, write GET request to endpt localhost:5000/practiceQuiz{subject, banding, level}/
//
