"use client";

import { useState } from "react";
import { Plus, Trash } from "lucide-react";
<<<<<<< Updated upstream
import Navbar from "../../components/ui/navbar";

const subjects = [
  "Biology",
  "Chemistry",
  "Mathematics",
  "History",
  "English",
] as const;

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [jsonOutput, setJsonOutput] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // New state for success message

  const [selectedSubject, setSelectedSubject] = useState(subjects[0]);
  const [selectedBanding, setSelectedBanding] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("PSLE");

  const [imageUrls, setImageUrls] = useState<string[]>([]);


  // Function to determine available bandings
  const getBandings = () => {
    if (selectedSubject === "Mathematics") return ["Math", "E Math", "A Math"];
    if (selectedSubject === "Biology" || selectedSubject === "Chemistry")
      return ["Combined", "Pure"];
    return [];
  };

  const availableBandings = getBandings();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles([...uploadedFiles, ...files]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedFiles([...uploadedFiles, ...files]);
    }
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles(uploadedFiles.filter((file) => file.name !== fileName));
  };

  const processFiles = async () => {
    setIsProcessing(true);
    setSuccessMessage(null); // Reset success message
    setImageUrls([]); // Reset image state

    const formData = new FormData();
    uploadedFiles.forEach((file) => {
        formData.append("file", file);
    });

    // Append additional data to the form data
    formData.append("subject", selectedSubject);
    formData.append("banding", selectedBanding);
    formData.append("level", selectedLevel);

    try {
        const response = await fetch("http://localhost:5003/api/ocr/split_pdf"`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error("Failed to process PDF");
        }

        const result = await response.json();
        console.log("Processed PDF:", result);

        // Extract images from the response
        const { images, subject, banding, level } = result;

        // Set JSON output and success message
        setJsonOutput(JSON.stringify(result, null, 2));
        setSuccessMessage(`Process completed! Subject: ${subject}, Banding: ${banding}, Level: ${level}`);

        // Update state with image URLs
        if (images && images.length > 0) {
            setImageUrls(images);
        } else {
            setImageUrls([]);
        }
    } catch (error) {
        console.error("Error processing PDF:", error);
        setJsonOutput(`Error: ${error}`);
    } finally {
        setIsProcessing(false);
    }
};




  return (
    <div className="container py-8">
      <Navbar />
      <div className="flex-1 p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 text-gradient">
            Upload Documents
          </h1>
          <p className="text-muted-foreground">
            Upload your past exam papers or exercise questions for analysis.
            We'll extract questions, identify topics, and prepare them for your
            question bank.
          </p>
        </div>

        <div className="flex flex-col gap-10">
          <div className="flex-1">
            <div
              className={`relative group rounded-2xl border-2 border-dashed p-12 text-center transition-all hover-card glass
                ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <h3 className="text-xl font-semibold mb-2">
                Drag & Drop Files Here
              </h3>
              <p className="text-muted-foreground mb-6">or</p>

              {/* Fixed Browse File Button */}
              <div className="relative inline-block">
                <label className="rounded-lg bg-blue-500 hover:bg-blue-700 text-white px-6 py-3 font-medium cursor-pointer">
                  Browse Files
                  <input
                    id="file-upload"
                    type="file"
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    multiple
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                Supported formats: PDF, DOC, DOCX
              </p>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="text-lg font-semibold">Uploaded Files</h3>
                <div className="space-y-3">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-xl"
                    >
                      <span>{file.name}</span>
                      <button
                        onClick={() => removeFile(file.name)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Filter Options */}
                <div className="mt-8 p-4 bg-white shadow-md rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Filter Options</h3>
                  <div className="space-y-4">
                    {/* Subject Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Subject
                      </label>
                      <select
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        value={selectedSubject}
                        onChange={(e) => {
                          setSelectedSubject(
                            e.target.value as (typeof subjects)[number]
                          );
                          setSelectedBanding(""); // Reset banding on subject change
                        }}
                      >
                        {subjects.map((subject) => (
                          <option key={subject} value={subject}>
                            {subject}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Banding Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Banding
                      </label>
                      <select
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        value={selectedBanding}
                        onChange={(e) => setSelectedBanding(e.target.value)}
                        disabled={availableBandings.length === 0}
                      >
                        {availableBandings.length > 0 ? (
                          availableBandings.map((banding) => (
                            <option key={banding} value={banding}>
                              {banding}
                            </option>
                          ))
                        ) : (
                          <option value="">N/A</option>
                        )}
                      </select>
                    </div>

                    {/* Level Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Level
                      </label>
                      <select
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                      >
                        {["PSLE", "Lower Secondary", "O Level", "N Level"].map(
                          (level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  onClick={processFiles}
                  disabled={isProcessing}
                  className="w-full bg-blue-500 hover:bg-blue-700 text-white py-2 rounded-lg mt-4"
                >
                  {isProcessing ? "Processing..." : "Process Files"}
                </button>

                {successMessage && (
                  <div className="mt-4 text-green-500">{successMessage}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
=======
import Sidebar from "../../components/ui/sidebar";
import Navbar from "../../components/ui/navbar";


export default function CreateQuizPage() {

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
        {/* Navbar at the top */}
        <Navbar />

        <div className="flex flex-grow">
            {/* Left Sidebar */}
            <div className="w-1/5 p-4 bg-white shadow-md">
            <Sidebar setSelectedSubject={setSelectedSubject} />
            </div>

            {/* Middle - MCQ Questions */}
            <div className="flex-1 p-6">
            <h1 className="text-2xl font-semibold mb-4">MCQ Questions - {selectedSubject}</h1>
            <div className="space-y-6">
                {questionsData[selectedSubject].map((q, index) => (
                <div key={index} className="p-4 border rounded-lg bg-white shadow relative">
                    <h2 className="text-lg font-medium">{q.question}</h2>
                    <ul className="mt-2 space-y-2">
                    {q.options.map((option, i) => (
                        <li key={i} className="p-2 border rounded-md hover:bg-gray-100 cursor-pointer">
                        {option}
                        </li>
                    ))}
                    </ul>
                    {/* Add to Folder Button */}
                    <button onClick={() => addToFolder(q.question, q.options)} className="absolute top-3 right-3 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition">
                    <Plus className="w-4 h-4" />
                    </button>
                </div>
                ))}
            </div>
            </div>

            {/* Right - Saved Folder */}
            <div className="w-1/4 p-4 bg-white shadow-md">
            <h2 className="text-xl font-semibold mb-4">Saved Questions</h2>
            {savedQuestions.length > 0 ? (
                <div className="space-y-4">
                {savedQuestions.map((q, index) => (
                    <div key={index} className="p-3 border rounded-lg bg-gray-50 relative">
                    <p className="font-medium">{q.question}</p>
                    <button onClick={() => removeFromFolder(q.question)} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition">
                        <Trash className="w-4 h-4" />
                    </button>
                    </div>
                ))}
                </div>
            ) : (
                <p className="text-gray-500">No questions saved.</p>
            )}
            </div>
        </div>
        </div>
    );
}
>>>>>>> Stashed changes
