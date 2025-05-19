/**
 * Utility functions for working with AI prompts
 */

/**
 * Formats a system prompt for the Gemini API
 * This ensures the prompt is properly formatted and includes any necessary context
 */
export function formatSystemPrompt(prompt: string): string {
  // Clean up the prompt by removing extra whitespace and normalizing line breaks
  const cleanedPrompt = prompt
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
    
  return cleanedPrompt;
}

/**
 * Formats a user message for the Gemini API
 * This ensures the message is properly formatted and includes any necessary context
 */
export function formatUserMessage(message: string): string {
  return message.trim();
}

/**
 * Extracts JSON from a string response
 * Looks for JSON in code blocks or directly in the text
 * Uses multiple strategies to find valid JSON
 */
export function extractJsonFromText(text: string): string | null {
  // Debug the input text
  console.log("[DEBUG] Extracting JSON from text:", {
    textLength: text.length,
    containsCodeBlock: text.includes('```'),
    containsCurlyBraces: text.includes('{') && text.includes('}')
  });

  // Strategy 1: Try to find JSON in a code block first (most common format from AI)
  const codeBlockRegex = /```(?:json)?([\s\S]*?)```/;
  const codeBlockMatch = text.match(codeBlockRegex);
  
  if (codeBlockMatch && codeBlockMatch[1]) {
    const potentialJson = codeBlockMatch[1].trim();
    console.log("[DEBUG] Found code block, content length:", potentialJson.length);
    
    if (isValidJsonString(potentialJson)) {
      console.log("[DEBUG] Valid JSON found in code block");
      return potentialJson;
    } else {
      // Try to extract JSON from within the code block
      const innerJsonMatch = potentialJson.match(/\{[\s\S]*\}/);
      if (innerJsonMatch && isValidJsonString(innerJsonMatch[0])) {
        console.log("[DEBUG] Valid JSON found within code block");
        return innerJsonMatch[0];
      }
    }
  }
  
  // Strategy 2: Try to find a JSON object directly in the text
  // This uses a more precise regex to match complete JSON objects
  const jsonRegex = /\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/g;
  const jsonMatches = text.match(jsonRegex);
  
  if (jsonMatches) {
    console.log("[DEBUG] Found potential JSON matches:", jsonMatches.length);
    
    // Try each match to find valid JSON
    for (const match of jsonMatches) {
      if (isValidJsonString(match)) {
        console.log("[DEBUG] Valid JSON found in direct text");
        return match;
      }
    }
  }
  
  // Strategy 3: Look for JSON with single quotes instead of double quotes
  // (sometimes AI models use incorrect JSON format)
  const singleQuoteJson = text.replace(/'/g, '"');
  const singleQuoteMatches = singleQuoteJson.match(jsonRegex);
  
  if (singleQuoteMatches) {
    console.log("[DEBUG] Found potential JSON with single quotes:", singleQuoteMatches.length);
    
    for (const match of singleQuoteMatches) {
      if (isValidJsonString(match)) {
        console.log("[DEBUG] Valid JSON found after converting single quotes");
        return match;
      }
    }
  }
  
  // Strategy 4: Handle specific Gemini API format with ```json prefix
  if (text.includes('```json')) {
    console.log("[DEBUG] Found ```json marker, trying to extract content");
    
    // Extract everything after ```json
    const jsonContent = text.split('```json')[1];
    if (jsonContent) {
      // Find the closing ``` if it exists
      const endPos = jsonContent.indexOf('```');
      const extractedContent = endPos > -1 ? jsonContent.substring(0, endPos).trim() : jsonContent.trim();
      
      if (isValidJsonString(extractedContent)) {
        console.log("[DEBUG] Valid JSON found after ```json marker");
        return extractedContent;
      } else {
        // Try to extract JSON from within the content
        const innerJsonMatch = extractedContent.match(/\{[\s\S]*\}/);
        if (innerJsonMatch && isValidJsonString(innerJsonMatch[0])) {
          console.log("[DEBUG] Valid JSON found within ```json content");
          return innerJsonMatch[0];
        }
      }
    }
  }
  
  // No valid JSON found
  console.log("[DEBUG] No valid JSON found in text");
  return null;
}

/**
 * Checks if a string is valid JSON
 */
function isValidJsonString(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Attempts to parse a JSON string safely
 * Returns null if parsing fails
 */
export function safeJsonParse(jsonString: string): any | null {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return null;
  }
}
