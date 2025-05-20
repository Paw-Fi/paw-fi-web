import { GoogleGenAI } from "@google/genai";

import type { Question } from "@/types/learning.types";
import { formatSystemPrompt, formatUserMessage, extractJsonFromText, safeJsonParse } from "@/utils/prompt-utils";

// Define interfaces for the service
export interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}

export interface GeminiResponse {
  text: string;
  content: string; // Adding content property to match expected interface
  isComplete: boolean;
  generatedLessons?: Lesson;
}

// Initialize the Gemini API client
const initializeGeminiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Gemini API key is missing. Please check your environment variables.");
    throw new Error("Gemini API key is missing");
  }
  
  return new GoogleGenAI({ apiKey });
};

// Create a chat session with the Gemini API
export const createChatSession = (initialPrompt: string, history?: Array<{role: string, parts: Array<{text: string}>}>) => {
  const genAI = initializeGeminiClient();
  
  // Format the system prompt to ensure it's properly formatted
  const formattedPrompt = formatSystemPrompt(initialPrompt);
  
  // Prepare the history array
  let chatHistory = [
    {
      role: "user",
      parts: [{ text: formattedPrompt }],
    },
  ];
  
  // If history is provided, append it after the system prompt
  if (history && history.length > 0) {
    chatHistory = chatHistory.concat(history);
  }
  
  // Create a chat session with the Gemini model
  const chat = genAI.chats.create({
    model: "gemini-2.0-flash", // Using the flash model for faster responses
    history: chatHistory,
  });
  
  return chat;
};

// Send a message to the Gemini API and get a response
export const sendMessageToGemini = async (
  chat: any, 
  message: string
): Promise<GeminiResponse> => {
  try {
    // Format the user message
    const formattedMessage = formatUserMessage(message);
    
    // Send the message to the Gemini API
    const response = await chat.sendMessage({
      message: formattedMessage,
    });
    
    // Extract the response text
    const responseText = response.text;
    
    // Debug: Log the full response for debugging
    console.log("[DEBUG] Full Gemini response:", responseText);
    
    // Extract JSON content from the response
    const jsonContent = extractJsonFromText(responseText);
    
    // Debug: Log the extracted JSON content
    console.log("[DEBUG] Extracted JSON content:", jsonContent);
    
    if (jsonContent) {
      // Parse the JSON data
      const jsonData = safeJsonParse(jsonContent);
      
      if (jsonData) {
        console.log("[DEBUG] Checking if JSON data is a valid lesson:", {
          hasId: !!jsonData.id,
          hasTitle: !!jsonData.title,
          hasQuestions: !!jsonData.questions && Array.isArray(jsonData.questions),
          questionsLength: jsonData.questions?.length
        });
        
        if (isValidLesson(jsonData)) {
          console.log("[DEBUG] Valid lesson data found!");
          
          // Create a clean text version without the JSON
          let cleanText = responseText;
          const jsonRegex = new RegExp(jsonContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          cleanText = responseText.replace(jsonRegex, '').trim();
          
          // If the clean text is inside a code block, remove the code block markers
          cleanText = cleanText.replace(/```[\s\S]*?```/g, '').trim();
          
          // If there's no clean text left, use a default message
          if (!cleanText) {
            cleanText = "Your personalized lesson is ready! 🎉";
          }
          
          return {
            text: cleanText,
            content: cleanText,
            isComplete: true,
            generatedLessons: jsonData,
          };
        } else {
          console.log("[DEBUG] JSON data is not a valid lesson");
        }
      }
    }
    
    // If no JSON lesson plan was found, return the text response
    return {
      text: responseText,
      content: responseText,
      isComplete: false,
    };
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    return {
      text: "Sorry, I encountered an error. Please try again.",
      content: "Sorry, I encountered an error. Please try again.",
      isComplete: false
    };
  }
};

// Get the chat history
export const getChatHistory = (chat: any): GeminiMessage[] => {
  return chat.getHistory();
};

// Helper function to validate if a JSON object has the structure of a lesson
function isValidLesson(data: any): boolean {
  // Check if the data has the required fields
  if (!data.id || !data.title || !data.questions || !Array.isArray(data.questions)) {
    return false;
  }
  
  // Check if the questions array has valid questions
  if (data.questions.length === 0) {
    return false;
  }
  
  // Validate that each question has the required fields
  for (const question of data.questions) {
    if (!question.id || !question.type || !question.question) {
      return false;
    }
    
    // Validate based on question type
    switch (question.type) {
      case 'scq': // Single choice question
      case 'mcq': // Multiple choice question
        if (!Array.isArray(question.options) || question.options.length === 0) {
          return false;
        }
        break;
      case 'match': // Matching question
        if (!Array.isArray(question.items) || !Array.isArray(question.options) || 
            !question.correctMatches) {
          return false;
        }
        break;
      case 'text-input': // Text input question
        if (!Array.isArray(question.correctAnswers) || question.correctAnswers.length === 0) {
          return false;
        }
        break;
      // Add other question types as needed
    }
  }
  
  return true;
}
