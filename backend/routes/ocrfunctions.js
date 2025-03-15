
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ✅ Define API Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model_name = "gemini-2.0-flash";

// ✅ Define Safety Settings
const safety_settings = [
    {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_ONLY_HIGH",
    },
];


// ✅ Define Output Paths
const img_output_folder = path.join(__dirname, 'output/images/Rowayne_Paper_Image');
//const json_output_folder = path.join(__dirname, 'output/Rowayne_Paper_Json'); Individual Files Output

if (!fs.existsSync(img_output_folder)) fs.mkdirSync(img_output_folder, { recursive: true });
if (!fs.existsSync(json_output_folder)) fs.mkdirSync(json_output_folder, { recursive: true });

// ✅ Define System Instructions for Bounding Box Extraction
const bounding_box_system_instructions = `
Return a JSON array only. Do not include explanations, markdown, or text outside JSON.
Extract **all diagrams, graphs, questions, and answer keys** (not just diagrams).

- Extract **all questions, including plain text questions**
- If answer options are split from their question, **ensure they are associated correctly**.
- Ensure table content, including borders and internal divisions, is fully captured.
- Maintain logical order when extracting text interrupted by diagrams or spanning multiple lines.
- **Answer Options (A, B, C, D)**: Label as \"box_label\": \"answer_options\".
  - Do **not** mark them as \"question\".
  - Extract **full answer options** (not just the first word of each row/column).
  - If answer options are in a **table**, extract them **row-wise** while preserving structure.
  - Ensure answer options are extracted as separate bounding boxes.
  - If answer options belong to a previous question (in case of broken text), associate the answer option and question sentence with the correct question.
- If the image contains a **final answer key**, use \"box_label\": \"answer_key\".
- Ensure **all rows of the answer key are captured**, not just the top row.
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

function parse_json(json_output) {
    // Extracts valid JSON content by removing Markdown formatting
    json_output = json_output.trim();
    if (json_output.startsWith("```json") && json_output.endsWith("```")) {
        json_output = json_output.replace(/^```json\s*|\s*```$/g, "");
    }
    return json_output.trim();
}

function extract_bounding_boxes(bounding_boxes_json) {
    // Parses bounding box JSON and extracts coordinates and labels dynamically
    const bounding_boxes = JSON.parse(bounding_boxes_json);
    let formatted_boxes = [];

    bounding_boxes.forEach(bounding_box => {
        const box_key = Object.keys(bounding_box).find(k => k.startsWith("box_"));
        const coordinates = bounding_box[box_key] || [];
        const label_key = Object.keys(bounding_box).find(k => k.endsWith("_label"));
        const label = bounding_box[label_key] || "Unknown Label";
        
        // ✅ Skip answer_key and answer_options bounding boxes
        if (["question", "answer_key", "answer_options", "box_label"].includes(label)) {
            return;
        }

        const question_number = bounding_box["question_number"] || null;
        formatted_boxes.push({
            label,
            bounding_box: coordinates,
            question_number: question_number
        });
    });

    return formatted_boxes;
}

const { createCanvas, loadImage } = require('canvas');

async function plot_bounding_boxes(im, bounding_boxes, image_filename, img_output_folder) {
    /**
     * Draws bounding boxes on an image, extracts the identified regions,
     * and saves both the annotated image and extracted diagrams.
     */
    const img = await loadImage(im);
    const width = img.width;
    const height = img.height;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    // Define colors for bounding boxes
    const colors = [
        'red', 'green', 'blue', 'yellow', 'orange', 'pink', 'purple',
        'brown', 'gray', 'beige', 'turquoise', 'cyan', 'magenta',
        'lime', 'navy', 'maroon', 'teal', 'olive', 'coral', 'lavender', 'violet',
        'gold', 'silver'
    ];

    const extracted_data = [];
    console.log("🔍 Bounding boxes:\n", bounding_boxes);

    for (let i = 0; i < bounding_boxes.length; i++) {
        const bounding_box = bounding_boxes[i];
        if (bounding_box.label !== "diagram" && bounding_box.label !== "graph") {
            continue; // Skip processing this bounding box
        }
        
        const color = colors[i % colors.length];
        const margin_x = Math.floor(0.05 * width);
        const margin_y = Math.floor(0.05 * height);

        let abs_y1 = Math.max(0, Math.floor(bounding_box.bounding_box[0] / 1000 * height) - margin_y);
        let abs_x1 = Math.max(0, Math.floor(bounding_box.bounding_box[1] / 1000 * width) - margin_x);
        let abs_y2 = Math.min(height, Math.floor(bounding_box.bounding_box[2] / 1000 * height) + margin_y);
        let abs_x2 = Math.min(width, Math.floor(bounding_box.bounding_box[3] / 1000 * width) + margin_x);

        // Ensure coordinates are ordered correctly
        if (abs_x1 > abs_x2) [abs_x1, abs_x2] = [abs_x2, abs_x1];
        if (abs_y1 > abs_y2) [abs_y1, abs_y2] = [abs_y2, abs_y1];

        // Draw bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.strokeRect(abs_x1, abs_y1, abs_x2 - abs_x1, abs_y2 - abs_y1);

        // Draw label
        ctx.fillStyle = color;
        ctx.font = "14px Arial";
        ctx.fillText(bounding_box.label, abs_x1 + 8, abs_y1 + 20);

        // Extract and Save Cropped Image
        const croppedCanvas = createCanvas(abs_x2 - abs_x1, abs_y2 - abs_y1);
        const croppedCtx = croppedCanvas.getContext('2d');
        croppedCtx.drawImage(img, abs_x1, abs_y1, abs_x2 - abs_x1, abs_y2 - abs_y1, 0, 0, abs_x2 - abs_x1, abs_y2 - abs_y1);
        
        const cropped_filename = `${image_filename}_cropped_${i + 1}.png`;
        const cropped_path = path.join(img_output_folder, cropped_filename);
        fs.writeFileSync(cropped_path, croppedCanvas.toBuffer('image/png'));

        extracted_data.push({
            label: bounding_box.label,
            bounding_box: bounding_box.bounding_box,
            question_number: bounding_box.question_number,
            cropped_image_path: cropped_path
        });
    }

    // Save Processed Image with Bounding Boxes
    const processed_filename = `${image_filename}_processed.png`;
    const processed_path = path.join(img_output_folder, processed_filename);
    fs.writeFileSync(processed_path, canvas.toBuffer('image/png'));

    console.log(extracted_data);
    return { extracted_data, processed_path };
}


const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const { plot_bounding_boxes } = require('./plotBoundingBoxes');

async function process_image(image_path, client, model_name, bounding_box_system_instructions, text_extraction_instructions, safety_settings, jsonOutputFolder) {
    /**
     * Processes an image by extracting bounding boxes first, then extracting text with references.
     */
    const image_filename = path.basename(image_path, path.extname(image_path));

    // ✅ Load Image
    const im = await loadImage(image_path);

    // 🚀 **Step 1: Call Gemini to Extract Bounding Boxes**
    const responseBoxes = await client.models.generate_content({
        model: model_name,
        contents: ["Identify and extract bounding boxes for diagrams and graphs.", im],
        config: {
            system_instruction: bounding_box_system_instructions,
            temperature: 0.5,
            safety_settings: safety_settings,
        },
    });

    // ✅ Parse Bounding Box Response
    const raw_boxes = response_boxes.text.trim();
    const cleaned_boxes = JSON.parse(raw_boxes);

    // ✅ Extract Bounding Box Data
    const bounding_boxes = extractBoundingBoxes(cleaned_boxes);

    // ✅ Draw Bounding Boxes & Save Image (if any found)
    const { extracted_data, processedPath } = await plot_bounding_boxes(image_path, bounding_boxes, image_filename, jsonOutputFolder);

    // 🚀 **Step 2: Call Gemini to Extract Text & Associate Bounding Boxes**
    const text_extraction_prompt = `Use the bounding box data: ${JSON.stringify(bounding_boxes)}\n\n${text_extraction_instructions}`;
    const responseText = await client.models.generate_content({
        model: model_name,
        contents: [text_extraction_prompt, im],
        config: {
            system_instruction: text_extraction_instructions,
            temperature: 0.5,
            safety_settings: safety_settings,
        },
    });

    // ✅ Parse Text Extraction Response
    const raw_text_response = responseText.text.trim();
    const cleaned_text_response = parseJson(raw_text_response);
    const extracted_questions = JSON.parse(cleaned_text_response);

    // ✅ Create a mapping of question_number → list of cropped_image_paths
    const cropped_image_map = {};

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

    // ✅ Assign "N/A" if no image is found for a question
    extracted_questions.forEach(question => {
        const q_number = String(question.question_number || "");
        question.image_filename = image_filename;
        question.image_path = cropped_image_map[q_number] || [];
        question.original_image_path = image_path;
        question.processed_image_path = processed_image_path;
    });

    // ✅ Save the extracted questions as JSON
    const json_output_path = path.join(json_output_folder, `${image_filename}.json`);
    fs.writeFileSync(json_output_path, JSON.stringify(extracted_questions, null, 4));

    console.log("✅ JSON output saved successfully.");
    return extracted_questions;
}


// ✅ Function to Consolidate Duplicate Questions
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

async function process_and_save_json(image_files, inputFolder, output_json_path, processImage) {
    let all_extracted_data = [];
    
    // Section A Setup
    const firstFive = image_files.slice(0, 8);  // Pg[1,10-16]
    const secondFive = image_files.slice(11, 12); // Pg[2]
    const thirdFive = image_files.slice(22, 23); // Pg[3]
    const fourthFive = image_files.slice(31, 37); // Pg[4,9]
    const lastFive = image_files.slice(25, 26);  // 27:28 for answer key if not deleted, 25:26 for deleted
    
    image_files = [...firstFive, ...secondFive, ...thirdFive, ...fourthFive, ...lastFive];

    for (const image_filename of image_files) {
        const image_path = path.join(inputFolder, image_file_name);
        console.log(`🚀 Processing: ${image_filename}`);
        
        const image_data = await process_image(image_path);  // Process image
        all_extracted_data = all_extracted_data.concat(image_data);
    }

    const consolidated_data = consolidate_questions(all_extracted_data);
    
    fs.writeFileSync(output_json_path, JSON.stringify(consolidated_data, null, 4));
    console.log(`✅ JSON saved at: ${output_json_path}`);
}

const fs = require("fs");

function merge_json_files(primary_json_path, secondary_json_path) {
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
    fs.unlinkSync(secondary_json_path);
    console.log(`✅ Merging complete. Updated JSON saved at: ${primary_json_path}`);
}


const input_folder = `/content/drive/MyDrive/FYP/Gemini OCR/Gemini exam papers/output/Rowayne_Papers/${paperName}`;
const primaryJsonPath = `/content/drive/My Drive/FYP/Gemini OCR/output/json/${paperName}_original.json`;
const secondaryJsonPath = `/content/drive/My Drive/FYP/Gemini OCR/output/json/${paperName}_secondary.json`;

// Get sorted list of image files
const imageFiles = fs.readdirSync(inputFolder)
    .filter(file => file.toLowerCase().match(/\.(jpg|png|jpeg)$/))
    .sort();

// Function to process images and save JSON
async function processImages() {
    await processAndSaveJson(imageFiles, inputFolder, primaryJsonPath);
    
    setTimeout(async () => {
        await processAndSaveJson(imageFiles, inputFolder, secondaryJsonPath);
        mergeJsonFiles(primaryJsonPath, secondaryJsonPath);
    }, 60000); // Sleep for 60 seconds
}

processImages().catch(console.error);


modules.export()
module.exports = router;
module.exports.calculateInOfficePercentage=calculateInOfficePercentage;