const fs = require('fs');
const path = require('path');

require('dotenv').config()
const { createCanvas, loadImage } = require('canvas');

// ✅ Define API Configuration
const { GoogleGenerativeAI } = require('@google/generative-ai');
//const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model_name = "gemini-2.0-flash"
const model = genAI.getGenerativeModel({ model: model_name });
//const client = new GoogleGenerativeAI({ apiKey: GOOGLE_API_KEY })


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

const OcrExecutionMinor = async(data) => {
    try {
        console.log("Data Received in OcrExecutionMinor", data)
        const paperName = data.paper_name
        console.log(paperName)
        //console.log('Current working directory:', process.cwd());
        
        const input_folder = 'routes/output_images'; //This is where the pdf extracted images are at.
        const primary_json_path = `../routes/output_json/${paperName}_original.json` //This is where the final json location is at.
        const secondary_json_path = `../routes/output_json/${paperName}_secondary.json` //This is the second exeuction file stored is at.
        
        console.log('Input folder path:', input_folder);
        console.log('Primary JSON path:', primary_json_path);
        console.log('Secondary JSON path:', secondary_json_path);


        // Get sorted list of image files
        const image_files = fs.readdirSync(input_folder)
            .filter(file => file.toLowerCase().match(/\.(jpg|png|jpeg)$/))
            .sort()
        
        console.log('Files in directory:', image_files);

    
        // Function to process images and save JSON
        async function processImages() {
            await process_and_save_json(image_files, input_folder, primary_json_path, model);
            console.log('⏳ Waiting for 60 seconds...')
            await delay(60000); // Wait 60 seconds
            await process_and_save_json(image_files, input_folder, secondary_json_path, model);
            merge_json_files(primary_json_path, secondary_json_path);
        }

        await processImages().catch(console.error);
    } catch (err){
        console.error(err)
        res.status(500).json({ error: err.message })
    }

}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function process_and_save_json(image_files, input_folder, output_json_path) {

    console.log("Image File ", image_files)
    console.log("Input Folder ", input_folder)
    console.log(output_json_path)
    let all_extracted_data = [];
    
    for (const image_filename of image_files) {
        const image_path = path.join(input_folder, image_filename);
        console.log(`🚀 Processing: ${image_filename}`);
        
        const image_data = process_image(image_path, model, model_name, bounding_box_system_instructions, text_extraction_instructions, safety_settings);  // Process image
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

async function process_image(image_path, model,model_name, bounding_box_system_instructions, text_extraction_instructions, safety_settings) {
    /**  client, 
     * Processes an image by extracting bounding boxes first, then extracting text with references.
     */
    const image_filename = path.basename(image_path, path.extname(image_path));

    // ✅ Load Image
    const im =  loadImage(image_path);
    console.log("loading image",image_path)


    // 🚀 **Step 1: Call Gemini to Extract Bounding Boxes**
    const response_boxes = await model.generateContent({
        contents: [
            "Identify and extract bounding boxes for diagrams and graphs.",
            im  // Assuming `im` is the image content
        ],
        system_instruction: bounding_box_system_instructions,  // Adjusting based on the error
        temperature: 0.5,
        safety_settings: safety_settings
    });

    console.log("I am response_boxes", response_boxes)

    console.log("I am here!")

    // ✅ Parse Bounding Box Response
    const raw_boxes = response_boxes.text.trim();
    const cleaned_boxes = JSON.parse(raw_boxes);

    // ✅ Extract Bounding Box Data
    const bounding_boxes = extract_bounding_boxes(cleaned_boxes);

    // ✅ Draw Bounding Boxes & Save Image (if any found)
    const { extracted_data, processed_image_path } =  plot_bounding_boxes(im, bounding_boxes, image_filename);

    // 🚀 **Step 2: Call Gemini to Extract Text & Associate Bounding Boxes**
    const text_extraction_prompt = `Use the bounding box data: ${JSON.stringify(bounding_boxes)}\n\n${text_extraction_instructions}`;
    const response_text = client.models.generate_content({
        model: model_name,
        contents: [text_extraction_prompt, im],
        config: {
            system_instruction: text_extraction_instructions,
            temperature: 0.5,
            safety_settings: safety_settings,
        },
    });

    // ✅ Parse Text Extraction Response
    const raw_text_response = response_text.text.trim();
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


module.exports = { OcrExecutionMinor };