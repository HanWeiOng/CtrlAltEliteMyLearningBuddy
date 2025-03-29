"use client";
import { Plus, Trash } from "lucide-react";
import Navbar from "../../components/ui/navbar";
import { useState, useEffect } from "react";

const subjects = [
  "Biology",
  "Chemistry",
  "Mathematics",
  "History",
  "English",
] as const;

const mathBandings = ["Math", "E Math", "A Math"];
const scienceBandings = ["Combined", "Pure"];

export default function UploadPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState({ step: 0, message: "" });
  const TOTAL_STEPS = 5;
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [jsonOutput, setJsonOutput] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // New state for success message
  const [selectedSubject, setSelectedSubject] = useState<(typeof subjects)[number]>(subjects[0]);
  const [selectedLevel, setSelectedLevel] = useState("PSLE");
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Function to determine available bandings
  const getBandings = () => {
    if (selectedSubject === "Mathematics") return mathBandings;
    if (selectedSubject === "Biology" || selectedSubject === "Chemistry")
      return scienceBandings;
    return [];
  };

  const availableBandings = getBandings();
  const [selectedBanding, setSelectedBanding] = useState(
    availableBandings.length > 0 ? availableBandings[0] : ""
  );

  // Update selectedBanding when selectedSubject changes
  useEffect(() => {
    const bandings = getBandings();
    if (bandings.length > 0) {
      setSelectedBanding(bandings[0]);
    } else {
      setSelectedBanding("");
    }
  }, [selectedSubject]);

  useEffect(() => {
    const eventSource = new EventSource("http://localhost:5003/api/ocr/progress-stream");
  
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data);
    };
  
    eventSource.onerror = () => {
      console.error("❌ SSE connection closed.");
      eventSource.close();
    };
  
    return () => {
      eventSource.close();
    };
  }, []);

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
 
    if (uploadedFiles.length === 0) {
      alert("❌ No file selected!");
      return;
  }



    // Append additional data to the form data
    formData.append("file", uploadedFiles[0]);  // Only sending first file
    formData.append("subject", selectedSubject);
    formData.append("banding", selectedBanding || (selectedSubject === "Mathematics" ? mathBandings[0] : scienceBandings[0]));
    formData.append("level", selectedLevel);
  
    try {
      const response = await fetch("http://localhost:5003/api/ocr/split_pdf", {
        method: "POST",
        body: formData,
      });
    
      if (!response.ok) {
        const errorRes = await response.json();
        // Check for specific status
        if (response.status === 409) {
          setErrorMessage(errorRes.message || "PDF already exists.");
        } else {
          setErrorMessage("Failed to process PDF. Please try again.");
        }
        throw new Error(errorRes.message || "Upload failed");
      }
    
      const result = await response.json();
      console.log("Processed PDF:", result);
    
      const { images, subject, banding, level } = result;
    
      setJsonOutput(JSON.stringify(result, null, 2));
      setSuccessMessage(`Process completed! Subject: ${subject}, Banding: ${banding}, Level: ${level}`);
      setErrorMessage(null); // Clear any previous errors
    
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
  }
    



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

                {/* Progress status section - OUTSIDE the button */}
                <div className="mt-4">
                  {!isProcessing && progress.step === 0 && (
                    <p className="text-gray-500 text-sm italic">Ready to process PDF.</p>
                  )}

                  {isProcessing && (
                    <>
                      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-500 ease-in-out"
                          style={{ width: `${(progress.step / TOTAL_STEPS) * 100}%` }}
                        />
                      </div>
                      <p className="text-sm text-blue-600 mt-2">
                        Step {progress.step}/{TOTAL_STEPS} — {progress.message}
                      </p>
                    </>
                  )}
                </div>

                {successMessage && (
                  <div className="mt-4 text-green-500">{successMessage}</div>
                )}
                {errorMessage && (
                  <div className="mt-4 text-red-500 font-medium">
                    {errorMessage}
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
