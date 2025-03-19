"use client";

import { useState } from "react";
import { Plus, Trash } from "lucide-react";
import Sidebar from "../../components/ui/sidebar";
import Navbar from "../../components/ui/navbar";

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
        </div>
    );
    
}
