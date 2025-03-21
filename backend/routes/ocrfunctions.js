const axios = require("axios");
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

require('dotenv').config()
const { createCanvas, loadImage } = require('canvas');

// ✅ Define API Configuration
const { GoogleGenerativeAI } = require('@google/generative-ai');
//const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model_name = "gemini-2.0-flash"
const model = genAI.getGenerativeModel({ model: model_name });
//const client = new GoogleGenerativeAI({ apiKey: GOOGLE_API_KEY })
const img_output_folder = 'routes/processed_images'


// ✅ Define Safety Settings
const safety_settings = [ 
    {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_ONLY_HIGH",
    },
];


// ✅ Define System Instructions for Bounding Box Extraction
const bounding_box_system_instructions = `
Return a JSON array only. Do not include explanations, markdown, or text outside JSON.
Extract all diagrams, graphs, questions, and answer keys** (not just diagrams).
- Extract all questions, including plain text questions
- If answer options are split from their question, ensure they are associated correctly.
- Ensure table content, including borders and internal divisions, is fully captured.
- Maintain logical order when extracting text interrupted by diagrams or spanning multiple lines.
- Answer Options (A, B, C, D): Label as "box_label": "answer_options".
- Do not mark them as "question".
- Extract full answer options (not just the first word of each row/column).
- If answer options are in a table, extract them row-wise while preserving structure.
- Ensure answer options are extracted as separate bounding boxes.
- If answer options belong to a previous question (in case of broken text), associate the answer option and question sentence with the correct question.
- If the image contains a final answer key, use "box_label": "answer_key".
- Ensure all rows of the answer key are captured, not just the top row.
- If the answer key is structured in multiple columns, extract them **sequentially from left to right, top to bottom**.
Ensure every question has a corresponding question number.
Ensure response follows this structure:

[
  {"box_1": [x1, y1, x2, y2], "box_1_label": "diagram", "question_number": "1"},
  {"box_2": [x1, y1, x2, y2], "box_2_label": "graph", "question_number": "2"}
]
`;

const text_extraction_instructions = `
    Return a JSON array only. Do not include explanations, markdown, or text outside JSON.

    Use the provided bounding box information to **extract structured question text**, **map diagrams/graphs**, and
    detect if an image contains an **answer key** and extract the structured answer data.

    **Ensure all answer keys are captured, including those in multiple columns or rows.**
    - If the answer key is structured in **multiple columns**, extract them **sequentially from left to right, top to bottom**.
    - Maintain consistency in answer key extraction to **ensure every question number is mapped correctly**.

    Format:

    [
        {
            "page_number": <int>,
            "question_number": <int>,
            "question_text": "<string>",
            "answer_options": [
                { "option": "A", "text": "<string>" },
                { "option": "B", "text": "<string>" },
                { "option": "C", "text": "<string>" },
                { "option": "D", "text": "<string>" }
            ],
            "diagram_reference": "based on question number",
            "bounding_box": {
                "top_left_x": <int>,
                "top_left_y": <int>,
                "width": <int>,
                "height": <int>
            },
            "image_path": "<string>",

            "answer_key": { "question_number": <int>, "correct_answer": "<string>" }
        }
    ]
`;



const OcrExecutionMinor = async (data) => {
    try {
        console.log("📥 Data Received in OcrExecutionMinor:", data);
        const paper_Name = data.paper_name;
        const subject = data.subject;
        console.log("📄 Paper Name:", paper_Name);

        const input_folder = 'routes/output_images'; // This is where the extracted images are stored. //setup s3 here
        const primary_json_path = `routes/output_json/${paper_Name}_original.json`; 
        const secondary_json_path = `routes/output_json/${paper_Name}_secondary.json`; 
        
        console.log("📂 Input folder path:", input_folder); //Need build S3 here
        console.log("📝 Primary JSON path:", primary_json_path);
        console.log("📝 Secondary JSON path:", secondary_json_path);

        // Get sorted list of image files
        const image_files = fs.readdirSync(input_folder)
            .filter(file => file.toLowerCase().match(/\.(jpg|png|jpeg)$/))
            .sort();
        
        console.log("📄 Files in directory:", image_files);

        // Function to process images and save JSON
        async function processImages() {
            console.log("I received paper_Name", paper_Name)
            await process_and_save_json(image_files, input_folder, primary_json_path, model, paper_Name);
            console.log('⏳ Waiting for 60 seconds...');
            
            //await delay(60000); // Wait 60 seconds
            
            //await process_and_save_json(image_files, input_folder, secondary_json_path, model);

            // ✅ TEMP: Comment this out for debugging JSON saving
            //merge_json_files(primary_json_path, secondary_json_path);
        }

        await processImages().catch(console.error);
        
    } catch (err) {
        console.error("❌ Error in OcrExecutionMinor:", err);
        throw err;  // Ensure the calling function can catch this error
    }
};


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function process_and_save_json(image_files, input_folder, output_json_path, model, paper_Name) {
    
    console.log("I received paper_Name @ process_and_save_json", paper_Name)
    console.log("Image File ", image_files)
    console.log("Input Folder ", input_folder)
    console.log(output_json_path)
    let all_extracted_data = [];


    for (const image_filename of image_files) {
        const image_path = path.join(input_folder, image_filename);
        console.log(`🚀 Processing: ${image_filename}`);
        
        const image_data = await process_image(image_path, model, model_name, bounding_box_system_instructions, text_extraction_instructions, safety_settings, paper_Name);
        all_extracted_data = all_extracted_data.concat(image_data);
    }

    const consolidated_data = consolidate_questions(all_extracted_data);

    // Extract filename from the output_json_path
    const output_filename = path.basename(output_json_path);

    // Get the directory of the output_json_path
    const output_directory = path.dirname(output_json_path);

    // Ensure the directory exists, create it if it doesn't
    if (!fs.existsSync(output_directory)) {
        fs.mkdirSync(output_directory, { recursive: true });  // Create the directory if it doesn't exist
    }

    // Write to the file (this will create the file if it doesn't exist)
    const output_file_path = path.join(output_directory, output_filename);

    if (fs.existsSync(output_file_path)) {
        console.log(`File already exists: ${output_file_path}`);
    } else {
        console.log(`File does not exist. Creating file: ${output_file_path}`);
        // Create the file and write data
        fs.writeFileSync(output_file_path, JSON.stringify(consolidated_data, null, 4));
        console.log(`✅ JSON saved at: ${output_file_path}`);
    }
}

async function process_image(image_path, model, model_name, bounding_box_system_instructions, text_extraction_instructions, safety_settings, paper_Name) {
    console.log("I received paper_Name @ process_image", paper_Name)

    const image_filename = path.basename(image_path, path.extname(image_path));

    // ✅ Load Image
    const im = await loadImage(image_path);
    console.log("loading image",image_path)

    const imageBuffer = fs.readFileSync(image_path);
    const imageBase64 = imageBuffer.toString('base64');

    const response_boxes = await model.generateContent({
        contents: [
            { role: "user", parts: [{ text: "Identify and extract bounding boxes for diagrams and graphs." }] },
            { role: "user", parts: [{ text: bounding_box_system_instructions }] },
            { role: "user", parts: [{ inlineData: { mimeType: "image/png", data: imageBase64 } }] }
        ],
        generationConfig: {
            temperature: 0.5,
        },
        safetySettings: safety_settings
    });

    console.log("📢 Full API Response:", JSON.stringify(response_boxes, null, 2));

    // ✅ Extract Text from API Response
    const raw_boxes = response_boxes?.response?.candidates?.[0]?.content?.parts?.find(part => part.text)?.text || null;

    // ✅ Ensure raw_boxes is a string before calling .trim()
    if (typeof raw_boxes !== "string" || raw_boxes.length === 0) {
        console.error("❌ API returned an invalid response:", raw_boxes);
        throw new Error("Invalid API response: Expected a non-empty string but got undefined or empty.");
    }

    // ✅ Remove Markdown (` 
    const cleaned_text = raw_boxes.replace(/```json/g, "").replace(/```/g, "").trim();

    let cleaned_boxes;
    try {
        cleaned_boxes = JSON.parse(cleaned_text);
        console.log("✅ Successfully parsed JSON:", cleaned_boxes);
    } catch (error) {
        console.error("❌ JSON Parsing Failed. Received:", cleaned_text);
        throw new Error("Invalid JSON received from API.");
    }
    // ✅ Extract Bounding Box Data
    const bounding_boxes = extract_bounding_boxes(cleaned_boxes);
    if (!fs.existsSync(img_output_folder)) {
        fs.mkdirSync(img_output_folder, { recursive: true });
    }
    // ✅ Draw Bounding Boxes & Save Image (if any found)
    const { extracted_data, processed_image_path } =  await plot_bounding_boxes(image_path, bounding_boxes, image_filename, img_output_folder, paper_Name);

    
    // 🚀 **Step 2: Call Gemini to Extract Text & Associate Bounding Boxes**

    const response_text = await model.generateContent({
        contents: [
            { role: "user", parts: [{ text: `Use the bounding box data: ${JSON.stringify(bounding_boxes)}` }] },
            { role: "user", parts: [{ text: text_extraction_instructions }] },
            { role: "user", parts: [{ inlineData: { mimeType: "image/png", data: imageBase64 } }] }
        ],
        generationConfig: {
            temperature: 0.5,
            
        },
        safetySettings: safety_settings
    });

    // ✅ Parse Text Extraction Response
    console.log("📢 Full API Response:", JSON.stringify(response_text, null, 2));

    // ✅ Extract text safely
    const raw_text_response = response_text?.response?.candidates?.[0]?.content?.parts?.find(part => part.text)?.text || null;

    if (!raw_text_response) {
        console.error("❌ API response did not return a valid text field. Received:", response_text);
        throw new Error("Invalid API response: Expected text data, but got null or undefined.");
    }

    // ✅ Clean and parse JSON response
    console.log("This is the extracted raw_text_response:", raw_text_response);

    const cleaned_text_response = raw_text_response.replace(/```json/g, "").replace(/```/g, "").trim();

    let extracted_questions;
    try {
        extracted_questions = JSON.parse(cleaned_text_response);
        console.log("✅ Successfully parsed extracted_questions:", extracted_questions);
    } catch (error) {
        console.error("❌ JSON Parsing Failed. Received:", cleaned_text_response);
        throw new Error("Invalid JSON received from API.");
    }


    // ✅ Create a mapping of question_number → list of cropped_image_paths
    const cropped_image_map = {};
    console.log("This is the extracted data : ",extracted_data)
    extracted_data.forEach(item => {
        
        const q_number = String(item.question_number || "");
        const label = item.label || "";
        if (q_number && !["answer_key", "answer_options"].includes(label)) {
            if (!cropped_image_map[q_number]) {
                cropped_image_map[q_number] = [];
            }
            cropped_image_map[q_number].push({
                original_image_path: image_path, //Add original image path
                cropped_image_path: item.cropped_image_path, //Add cropped image path
                processed_image_path: processed_image_path, //Add processed image path
                label: item.label,
            });
        }
    });
    console.log("This is the Cropped_Image_Map : ", cropped_image_map)

    console.log("This is the extracted questions : ",extracted_questions)

    // ✅ Assign "N/A" if no image is found for a question
    extracted_questions.forEach(question => {
        const q_number = String(question.question_number || "");
        question.image_filename = image_filename;
        question.image_path = cropped_image_map[q_number] || [];
        question.original_image_path = image_path;
        question.processed_image_path = processed_image_path;
    });

    console.log("✅ JSON output saved successfully.");
    return extracted_questions;
}

function consolidate_questions(extracted_questions) {
    /** Moves answer keys from duplicate questions to the first occurrence. */
    const question_map = new Map();
    
    extracted_questions.forEach(question => {
        const q_number = question.question_number;
        
        if (question_map.has(q_number)) {
            // If duplicate, move `answer_key` to the first occurrence
            if ("answer_key" in question && question.answer_key) {
                question_map.get(q_number).answer_key = question.answer_key;
            }
        } else {
            // Store the first occurrence of the question
            question_map.set(q_number, question);
        }
    });
    
    // Return only unique questions (sorted by question_number)
    return Array.from(question_map.values()).sort((a, b) => a.question_number - b.question_number);
}

async function merge_json_files(primary_json_path, secondary_json_path) {
    const primary_data = JSON.parse(fs.readFileSync(primary_json_path, "utf8"));
    const secondary_data = JSON.parse(fs.readFileSync(secondary_json_path, "utf8"));

    const images_to_delete = new Set();

    primary_data.forEach((p_question, index) => {
        const s_question = secondary_data[index];
        if (!s_question) return;

        // Handle answer options
        p_question.answer_options?.forEach((p_option, i) => {
            const s_option = s_question.answer_options?.[i];
            if (s_option) {
                const s_option_text = s_option.text || "";
                const p_option_text = p_option.text || "";
                if (s_option_text.length > p_option_text.length) {
                    p_option.text = s_option_text;
                }
            }
        });

        // Handle image paths
        if (p_question.image_path && s_question.image_path) {
            const p_image_paths = Object.fromEntries(p_question.image_path.map(img => [img.original_image_path, img]));
            const s_image_paths = Object.fromEntries(s_question.image_path.map(img => [img.original_image_path, img]));
            
            const combined_image_paths = { ...p_image_paths};
            

            Object.entries(s_image_paths).forEach(([key, value]) => {
                if (combined_image_paths[key]) {  
                    // If key exists and value is different, mark the previous one for deletion
                    if (JSON.stringify(combined_image_paths[key]) !== JSON.stringify(value)) {
                        images_to_delete.add(combined_image_paths[key].cropped_image_path);
                    }
                }
                combined_image_paths[key] = value; // Overwrite or add new key-value pair
            });

            const removed_images = Object.keys(p_image_paths).filter(key => !combined_image_paths[key]);
            removed_images.forEach(removed_image => {
                images_to_delete.add(p_image_paths[removed_image].cropped_image_path);
            });

            p_question.image_path = Object.values(combined_image_paths).sort((a, b) => a.original_image_path.localeCompare(b.original_image_path));
        }
    });

    images_to_delete.forEach(image_path => {
        if (fs.existsSync(image_path)) {
            fs.unlinkSync(image_path);
            console.log(`🗑️ Deleted image: ${image_path}`);
        } else {
            console.log(`⚠️ Image not found for deletion: ${image_path}`);
        }
    });

    

    fs.writeFileSync(primary_json_path, JSON.stringify(primary_data, null, 4));

    const primary_json_path_data = JSON.parse(fs.readFileSync(primary_json_path, "utf8"));


    const response = await fetch('http://localhost:5003/api/ocr/insertQuestion', {
        method: 'POST',
        headers : { 
            'Content-Type': 'application/json',  // Specify the content type
        },
        body: JSON.stringify({
            data: primary_json_path_data  // Sending the images and paper name
        })
    });

    fs.unlinkSync(secondary_json_path);
    console.log(`✅ Merging complete. Updated JSON saved at: ${primary_json_path}`);
}


// ✅ Function to Plot Bounding Boxes & Extract Images
async function plot_bounding_boxes(image_path, bounding_boxes, image_filename, img_output_folder, paper_Name) {
        console.log("This is the Plot_Bounding_Boxes Paper Name :", paper_Name)
        // ✅ Ensure output directory exists
        if (!fs.existsSync(img_output_folder)) {
            fs.mkdirSync(img_output_folder, { recursive: true });
        }
    
        // ✅ Load the image
        const img = await loadImage(image_path);
        const width = img.width;
        const height = img.height;
    
        // ✅ Create a canvas to draw the image
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
    
        // ✅ Define colors for bounding boxes
        const colors = [
            'red', 'green', 'blue', 'yellow', 'orange', 'pink', 'purple',
            'brown', 'gray', 'beige', 'turquoise', 'cyan', 'magenta',
            'lime', 'navy', 'maroon', 'teal', 'olive', 'coral', 'lavender', 'violet',
            'gold', 'silver'
        ];
    
        let extracted_data = [];
    
        console.log("🔍 Bounding boxes received:\n", bounding_boxes);
    
        // ✅ Iterate over bounding boxes
        for (let i = 0; i < bounding_boxes.length; i++) {
            let bounding_box = bounding_boxes[i];
            if (!["diagram", "graph"].includes(bounding_box.label)) {
                continue; // Skip non-diagram/graph bounding boxes
            }
    
            // ✅ Assign a unique color for each box
            let color = colors[i % colors.length];
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.font = '16px Arial';
            ctx.fillStyle = color;
    
            // ✅ Define margin expansion (5% of width & height)
            let marginX = Math.round(0.05 * width);
            let marginY = Math.round(0.05 * height);
    
            // ✅ Extract and expand bounding box coordinates
            let absY1 = Math.max(0, Math.round((bounding_box.bounding_box[0] / 1000) * height) - marginY);
            let absX1 = Math.max(0, Math.round((bounding_box.bounding_box[1] / 1000) * width) - marginX);
            let absY2 = Math.min(height, Math.round((bounding_box.bounding_box[2] / 1000) * height) + marginY);
            let absX2 = Math.min(width, Math.round((bounding_box.bounding_box[3] / 1000) * width) + marginX);
    
            // ✅ Ensure coordinates are ordered correctly
            if (absX1 > absX2) [absX1, absX2] = [absX2, absX1];
            if (absY1 > absY2) [absY1, absY2] = [absY2, absY1];
    
            // ✅ Draw the bounding box
            ctx.strokeRect(absX1, absY1, absX2 - absX1, absY2 - absY1);
    
            // ✅ Draw label text
            ctx.fillText(bounding_box.label, absX1 + 8, absY1 + 20);
    
            // ✅ Extract and Save Cropped Image
            const croppedCanvas = createCanvas(absX2 - absX1, absY2 - absY1);
            const croppedCtx = croppedCanvas.getContext('2d');
            croppedCtx.drawImage(img, absX1, absY1, absX2 - absX1, absY2 - absY1, 0, 0, absX2 - absX1, absY2 - absY1);
    
            // ✅ Corrected string interpolation with backticks
            const cropped_filename = `${image_filename}_cropped_${i + 1}.png`;
            const cropped_path = path.join(img_output_folder, cropped_filename);
    
            console.log(`🔹 Saving cropped image at: ${cropped_path}`);
    
            // ✅ Save Cropped Image inside the loop
            await new Promise((resolve, reject) => {
                const croppedStream = fs.createWriteStream(cropped_path);
                const croppedPNGStream = croppedCanvas.createPNGStream();
                croppedPNGStream.pipe(croppedStream);
                croppedStream.on("finish", async () => {
                    console.log(`✅ Cropped image saved at: ${cropped_path}`);
                    // ✅ Upload after the file is fully saved
                    try {
                        await fs.promises.access(cropped_path);
                        const formDataImage = new FormData();
                        formDataImage.append("image", fs.createReadStream(cropped_path));  // ✅ Read file properly
                        formDataImage.append("paper_name", "AES_2019"); // ✅ Append paper name
                        console.log("📤 Uploading image:", cropped_path);
                        const headers = formDataImage.getHeaders(); // Get correct multipart headers

                   
                        const uploadImageResponse = await axios.post(
                            "http://localhost:5003/api/s3BucketCRUD/uploadProcessedImage",
                            formDataImage,
                            { headers }
                        );

                        console.log("✅ Upload successful:", uploadImageResponse.data);
                    
                    } catch (uploadError) {
                        console.error("❌ Upload failed:", uploadError.response?.data || uploadError.message);
                    }
                    console.log("I failed to continue")
                    resolve();
                    /*
                    const formDataImage = new FormData();
                    formDataImage.append("image", fs.createReadStream(cropped_path));
                    formDataImage.append("paper_name", paper_Name); // Example: Set paper name
    
                    const uploadImageResponse = await axios.post(
                        "http://localhost:5003/api/s3BucketCRUD/uploadProcessedImage", // ✅ Fixed URL
                        formDataImage,
                        {
                            headers: {
                                "Content-Type": "multipart/form-data",
                            },
                        }
                    );*/
                });
                croppedStream.on("error", reject);
            });
    
            // ✅ Store extracted data
            extracted_data.push({
                label: bounding_box.label,
                bounding_box: bounding_box.bounding_box,
                question_number: bounding_box.question_number,
                cropped_image_path: cropped_path
            });
        }
    
        // ✅ Save Processed Image with Bounding Boxes only once after the loop
        const processed_filename = `${image_filename}_processed.png`;
        const processed_path = path.join(img_output_folder, processed_filename);
        console.log(`🔹 Saving processed image at: ${processed_path}`);

    await new Promise((resolve, reject) => {
        const processedStream = fs.createWriteStream(processed_path);
        const processedPNGStream = canvas.createPNGStream();
        processedPNGStream.pipe(processedStream);
        processedStream.on("finish", () => {
            console.log(`✅ Processed image saved at: ${processed_path}`);
            resolve();
        });
        processedStream.on("error", reject);
    });

    console.log("✅ Extracted Data from Bounding Boxes:", extracted_data);
    return { extracted_data, processed_path };
}

//     //
//     // ✅ Load the image
//     const img = await loadImage(image_path);
//     const width = img.width;
//     const height = img.height;

//     // ✅ Create a canvas to draw the image
//     const canvas = createCanvas(width, height);
//     const ctx = canvas.getContext('2d');
//     ctx.drawImage(img, 0, 0, width, height);

//     // ✅ Define colors for bounding boxes
//     const colors = [
//         'red', 'green', 'blue', 'yellow', 'orange', 'pink', 'purple',
//         'brown', 'gray', 'beige', 'turquoise', 'cyan', 'magenta',
//         'lime', 'navy', 'maroon', 'teal', 'olive', 'coral', 'lavender', 'violet',
//         'gold', 'silver'
//     ];

//     let extracted_data = [];

//     console.log("🔍 Bounding boxes:\n", bounding_boxes);

//     // ✅ Iterate over bounding boxes
//     for (let i = 0; i < bounding_boxes.length; i++) {
//         let bounding_box = bounding_boxes[i];
//         if (!["diagram", "graph"].includes(bounding_box.label)) {
//             continue; // Skip non-diagram/graph bounding boxes
//         }

//         // ✅ Assign a unique color for each box
//         let color = colors[i % colors.length];
//         ctx.strokeStyle = color;
//         ctx.lineWidth = 4;
//         ctx.font = '16px Arial';
//         ctx.fillStyle = color;

//         // ✅ Define margin expansion (5% of width & height)
//         let marginX = Math.round(0.05 * width);
//         let marginY = Math.round(0.05 * height);

//         // ✅ Extract and expand bounding box coordinates
//         let absY1 = Math.max(0, Math.round((bounding_box.bounding_box[0] / 1000) * height) - marginY);
//         let absX1 = Math.max(0, Math.round((bounding_box.bounding_box[1] / 1000) * width) - marginX);
//         let absY2 = Math.min(height, Math.round((bounding_box.bounding_box[2] / 1000) * height) + marginY);
//         let absX2 = Math.min(width, Math.round((bounding_box.bounding_box[3] / 1000) * width) + marginX);

//         // ✅ Ensure coordinates are ordered correctly
//         if (absX1 > absX2) [absX1, absX2] = [absX2, absX1];
//         if (absY1 > absY2) [absY1, absY2] = [absY2, absY1];

//         // ✅ Draw the bounding box
//         ctx.strokeRect(absX1, absY1, absX2 - absX1, absY2 - absY1);

//         // ✅ Draw label text
//         ctx.fillText(bounding_box.label, absX1 + 8, absY1 + 20);

//         // ✅ Extract and Save Cropped Image
//         const croppedCanvas = createCanvas(absX2 - absX1, absY2 - absY1);
//         const croppedCtx = croppedCanvas.getContext('2d');
//         croppedCtx.drawImage(img, absX1, absY1, absX2 - absX1, absY2 - absY1, 0, 0, absX2 - absX1, absY2 - absY1);

//         const cropped_filename = `${image_filename}_cropped_${i + 1}.png`;
//         const cropped_path = path.join(img_output_folder, cropped_filename);
//         await new Promise((resolve, reject) => {
//             const croppedStream = fs.createWriteStream(cropped_path);
//             const croppedPNGStream = croppedCanvas.createPNGStream();
//             croppedPNGStream.pipe(croppedStream);
//             croppedStream.on("finish", () => {
//                 console.log(`✅ Cropped image saved at: ${cropped_path}`);
//                 resolve();
//             });
//             croppedStream.on("error", reject);
//         });
//         extracted_data.push({
//             label: bounding_box.label,
//             bounding_box: bounding_box.bounding_box,
//             question_number: bounding_box.question_number,
//             cropped_image_path: cropped_path
//         });
        
//         const processed_filename = `${image_filename}_processed.png`;

//         const processed_path = path.join(img_output_folder, processed_filename);

//         await new Promise((resolve, reject) => {
//             const processedStream = fs.createWriteStream(processed_path);
//             const processedPNGStream = canvas.createPNGStream();
//             processedPNGStream.pipe(processedStream);
//             processedStream.on("finish", () => {
//                 console.log(`✅ Processed image saved at: ${processed_path}`);
//                 resolve();
//             });
//             processedStream.on("error", reject);
//         });

//         console.log("✅ Extracted Data from Bounding Boxes:", extracted_data);    return { extracted_data, processed_path };
       
//     }
   
//     out.on('finish', () => console.log(`✅ Processed image saved at: ${processed_path}`));
//     console.log("This is the extracted data in plot_bounding_boxes :", extracted_data)
//     return { extracted_data, processed_path };
// } 


function extract_bounding_boxes(bounding_boxes_json) {
    /**
     * Parses bounding box JSON and extracts coordinates and labels dynamically.
     * @param {string|object} bounding_boxes_json - JSON string or object containing bounding box data.
     * @returns {Array} Extracted bounding box data with label, coordinates, and question number.
     */

    let bounding_boxes;

    // ✅ Check if bounding_boxes_json is already an object
    if (typeof bounding_boxes_json === "object") {
        bounding_boxes = bounding_boxes_json;
    } else {
        try {
            bounding_boxes = JSON.parse(bounding_boxes_json);
        } catch (error) {
            console.error("❌ Invalid JSON format:", error);
            console.error("Received Data:", bounding_boxes_json);
            return [];
        }
    }

    let formatted_boxes = [];

    bounding_boxes.forEach(bounding_box => {
        // ✅ Find the key that starts with "box_"
        const box_key = Object.keys(bounding_box).find(k => k.startsWith("box_"));
        const coordinates = bounding_box[box_key] || [];

        // ✅ Find the key that ends with "_label"
        const label_key = Object.keys(bounding_box).find(k => k.endsWith("_label"));
        const label = bounding_box[label_key] || "Unknown Label";

        // ✅ Skip unnecessary labels
        if (["question", "answer_key", "answer_options", "box_label"].includes(label)) {
            return;
        }

        // ✅ Extract question number if available
        const question_number = bounding_box.question_number || null;

        // ✅ Format and store bounding box data
        formatted_boxes.push({
            label: label,
            bounding_box: coordinates,
            question_number: question_number
        });
    });

    return formatted_boxes;
}

module.exports = { OcrExecutionMinor };