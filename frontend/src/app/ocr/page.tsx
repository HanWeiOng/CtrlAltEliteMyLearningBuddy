"use client";

import { useState } from "react";
import { Plus, Trash } from "lucide-react";
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

    const formData = new FormData();
    uploadedFiles.forEach((file) => {
        formData.append("file", file);
    });

    // Append additional data to the form data
    formData.append("subject", selectedSubject);
    formData.append("banding", selectedBanding);
    formData.append("level", selectedLevel);

    try {
        const response = await fetch("http://localhost:5003/api/ocr/split_pdf", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error("Failed to process PDF");
        }

        const result = await response.json();
        console.log("Processed PDF:", result);

        // Set JSON output and success message
        setJsonOutput(JSON.stringify(result, null, 2));
        setSuccessMessage(`Process completed! Subject: ${result.subject}, Banding: ${result.banding}, Level: ${result.level}`);
    } catch (error) {
        console.error("Error processing PDF:", error);
        setJsonOutput(`Error: ${error.message}`);
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