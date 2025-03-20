"use client";

import { useState } from "react";
import { Plus, Trash } from "lucide-react";
import Sidebar from "../../components/ui/sidebar";
import Navbar from "../../components/ui/navbar";
import axios from "axios";

// Dummy MCQ Data

const staticListOfImages = {
    message: "Successfully processed PDF.",
    images: [
      "http://localhost:5003/api/ocr/images/page_1-1.png",
      "http://localhost:5003/api/ocr/images/page_2-1.png",
      "http://localhost:5003/api/ocr/images/page_3-1.png",
      "http://localhost:5003/api/ocr/images/page_4-1.png",
      "http://localhost:5003/api/ocr/images/page_5-1.png",
      "http://localhost:5003/api/ocr/images/page_6-1.png",
      "http://localhost:5003/api/ocr/images/page_7-1.png",
      "http://localhost:5003/api/ocr/images/page_8-1.png",
      "http://localhost:5003/api/ocr/images/page_9-1.png",
      "http://localhost:5003/api/ocr/images/page_10-1.png",
      "http://localhost:5003/api/ocr/images/page_11-1.png",
      "http://localhost:5003/api/ocr/images/page_12-1.png",
      "http://localhost:5003/api/ocr/images/page_13-1.png",
      "http://localhost:5003/api/ocr/images/page_14-1.png"
    ],
    paper_name: "AES 2019",
    subject: "Biology",
    banding: "Pure",
    level: "O Level"
  };

  
//   const staticListOfImages = {
//     message: "Successfully processed PDF.",
//     images: [
//       "http://localhost:5003/api/ocr/images/page_1-1.png",
//       "http://localhost:5003/api/ocr/images/page_2-1.png",
//       "http://localhost:5003/api/ocr/images/page_13-1.png"
//     ],
//     paper_name: "AES 2019"
//   };

export default function CreateQuizPage() {

    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const OcrTest = async () => {
        try {
            /*
            const test_paper = 'AES%202019'
            console.log(test_paper)

            const responseListOfImages= await fetch(`http://localhost:5003/api/ocr/get_processed_data/${test_paper}`, {
                method: 'GET', 
                headers: {
                    'Accept': 'application/json' // Ensuring JSON response
                }
            });
        
            if (!responseListOfImages.ok) {
                throw new Error(`HTTP error! Status: ${responseListOfImages.status}`);
            }
        
            const staticListOfImages = await responseListOfImages.json(); // Parse response
            */
            
            console.log ("This is the data :", staticListOfImages)


            const response = await fetch('http://localhost:5003/api/ocr/processImages', {
                method: 'POST',
                headers : { 
                    'Content-Type': 'application/json',  // Specify the content type
                },
                body: JSON.stringify({
                    data: staticListOfImages  // Sending the images and paper name
                })
            });
            

    
            
            // You can process the response here
            if (response.ok) {
                const data = await response.json();
                console.log('Response data:', data);
            } else {
                console.error('Failed to send request:', response.status);
            }
        } catch (error) {
            console.error('Error occurred while making the request:', error);
        }
    };


    const TopicLabelTest = async () => {
        try {
            const response = await fetch('http://localhost:5003/api/ocr/topiclabel', {
                method: 'POST'
            });
             // You can process the response here
             if (response.ok) {
                const data = await response.json();
                console.log('Response data:', data);
            } else {
                console.error('Failed to send request:', response.status);
            }

        } catch (error) {
            console.error('Error occurred while making the request:', error);
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };
    
    // Handle file upload
    const handleUpload = async () => {
        if (!selectedFile) {
            alert("❌ No file selected!");
            return;
        }
    
        try {
            const formDataImage = new FormData();
            formDataImage.append("image", selectedFile);
            formDataImage.append("paper_name", "AES_2019"); // Example: Set paper name
            formDataImage.append("question_number", "1"); // Example: Set question number
            console.log(selectedFile)            
    
            const uploadImageResponse = await axios.post(
                "http://localhost:5003/api/s3BucketCRUD/uploadProcessedImage", // ✅ Fixed URL
                formDataImage,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
    
            console.log("✅ Image uploaded:", uploadImageResponse.data);
            alert("✅ Image uploaded successfully!");
        } catch (error) {
            console.error("❌ Upload error:", error);
            alert("❌ Failed to upload image!");
        }
    };

    const handleRetrieve = async () => {
        try {
            const requestData = {
                imageName: "Screenshot 2025-03-19 at 1.03.13â¯PM.png",  // Example: Replace with the actual image name
                folderName : "AES_2019"
            };
    
            const response = await axios.post(
                "http://localhost:5003/api/s3BucketCRUD/retrieveProcessedImage", // ✅ Fixed API URL
                requestData, // ✅ Send data in request body
                {
                    headers: {
                        "Content-Type": "application/json", // ✅ Fix: Use JSON instead of multipart/form-data
                    },
                }
            );
    
            console.log("✅ Image retrieved:", response.data.signedUrl);
            alert("✅ Image retrieved successfully!");
    
        } catch (error) {
            console.error("❌ Retrieval error:", error);
            alert("❌ Failed to retrieve image!");
        }
    };
    
    
    
    
    return (
        <div>
            <div>
                <button 
                    onClick={OcrTest} 
                    style={{
                        fontSize: "20px",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        cursor: "pointer"
                    }}
                >
                    Click Me
                </button>
            </div>
    
            <div>
                <button 
                    onClick={TopicLabelTest} 
                    style={{
                        fontSize: "20px",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        cursor: "pointer"
                    }}
                >
                    Click Me for Topic Label Test
                </button>
            </div>
            <div>
                <input type="file" accept="image/*" onChange={handleFileChange} className="mb-3" />
                <button 
                    onClick={handleUpload} 
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
                >
                    "Upload Image"
                </button>'
            </div>
            <div>
                <button 
                    onClick={handleRetrieve} 
                    style={{
                        fontSize: "20px",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        cursor: "pointer"
                    }}
                >
                    Click Me
                </button>
            </div>


            
        </div>
    );
    
}
