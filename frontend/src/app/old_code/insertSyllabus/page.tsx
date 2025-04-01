// "use client";

// import { useState } from "react";
// import Navbar from "@/components/ui/navbar";
// import Sidebar from "@/components/ui/sidebar";

// export default function InsertSyllabusPage() {
//   const [selectedSubject, setSelectedSubject] = useState<string>("Biology");
//   const [selectedBanding, setSelectedBanding] = useState<string | null>(
//     "Combined"
//   );
//   const [selectedLevel, setSelectedLevel] = useState<string>("PSLE");
//   const [uploadedFile, setUploadedFile] = useState<File | null>(null);

//   const updateFilters = (
//     subject: string,
//     banding: string | null,
//     level: string
//   ) => {
//     setSelectedSubject(subject);
//     setSelectedBanding(banding);
//     setSelectedLevel(level);
//   };

//   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
//     if (event.target.files && event.target.files[0]) {
//       setUploadedFile(event.target.files[0]);
//     }
//   };

//   const handleSubmit = async () => {
//     if (!uploadedFile) {
//       alert("Please upload a JSON file.");
//       return;
//     }

//     const reader = new FileReader();
//     reader.onload = async (e) => {
//       if (e.target?.result) {
//         const jsonData = e.target.result as string;

//         try {
//           const response = await fetch(
//             `${process.env.NEXT_PUBLIC_API_URL}/api/ocr/uploadSyllabus`,
//             {
//               method: "POST",
//               headers: {
//                 "Content-Type": "application/json",
//               },
//               body: JSON.stringify({
//                 jsonData,
//                 subject: selectedSubject,
//                 banding:
//                   selectedBanding === "Combined" ? "N.A" : selectedBanding, // Ensure "N.A" is sent
//                 level: selectedLevel,
//               }),
//             }
//           );

//           if (!response.ok) {
//             const errorData = await response.json();
//             throw new Error(errorData.error || "Failed to upload syllabus");
//           }

//           alert("File uploaded successfully!");
//         } catch (error) {
//           console.error("Error uploading file:", error);
//         }
//       }
//     };
//     reader.readAsText(uploadedFile!);
//   };

//   return (
//     <div className="min-h-screen flex flex-col">
//       {/* Navbar */}
//       <Navbar />

//       <div className="flex flex-1 flex-col p-8">
//         <h1 className="text-2xl font-bold mb-4">Insert Syllabus</h1>

//         {/* File Upload */}
//         <div className="mb-6">
//           <label className="block text-gray-700 font-medium mb-2">
//             Upload JSON File
//           </label>
//           <input
//             type="file"
//             accept=".json"
//             onChange={handleFileUpload}
//             className="block w-full p-2 border rounded-md"
//           />
//         </div>

//         {/* Sidebar for Filters */}
//         <div className="mb-6">
//           <h2 className="text-lg font-semibold mb-4">Select Filters</h2>
//           <Sidebar updateFilters={updateFilters} />
//         </div>

//         {/* Submit Button */}
//         <button
//           onClick={handleSubmit}
//           className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
//         >
//           Submit
//         </button>
//       </div>
//     </div>
//   );
// }
