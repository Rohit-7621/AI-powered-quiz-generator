const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const path = require("path");

const {
    GoogleGenAI,
    createUserContent,
    createPartFromUri
} = require("@google/genai");

dotenv.config();

const app = express();

const upload = multer({
    dest: "uploads/"
});

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/generate-quiz", upload.single("pdf"), async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                error: "Please upload a PDF."
            });
        }

        console.log("PDF received:", req.file.originalname);

        const uploadedFile = await ai.files.upload({
            file: req.file.path,
            config: {
                mimeType: "application/pdf"
            }
        });

        console.log("PDF uploaded to Gemini.");

        const prompt = `
You are an AI quiz generator.

Read the uploaded PDF carefully.

Create 5 multiple-choice questions based ONLY on the information
contained in the PDF.

Each question must have:
- question
- four options
- correct answer

Return ONLY valid JSON.

Use exactly this format:

{
  "questions": [
    {
      "question": "Question here",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "answer": "Option A"
    }
  ]
}
`;

        const response = await ai.models.generateContent({

            model: "gemini-3.6-flash",

            contents: createUserContent([
                prompt,
                createPartFromUri(
                    uploadedFile.uri,
                    uploadedFile.mimeType
                )
            ])

        });

        console.log("Gemini response received.");

        let text = response.text;

        text = text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        const quiz = JSON.parse(text);

        res.json(quiz);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: error.message
        });

    }

});

app.listen(3000, () => {

    console.log("Server running on port 3000");

});
