export interface MessageSection {
  title: string;
  content: string;
  subsections?: {
    title: string;
    content: string;
  }[];
}

export interface ParsedMessage {
  shortContent: string;
  sections: MessageSection[];
  hasLongContent: boolean;
}

/**
 * Parses the message content, attempting to identify and structure it.
 * It is specifically designed to parse detailed, instructional content (like Content 1)
 * and skip summary/question-based content (like Content 2 and 3).
 *
 * @param content The raw string content of the message.
 * @returns A ParsedMessage object.
 */
export function parseMessageContent(content: string): ParsedMessage {
  // --- Differentiation Logic ---

  // Exclusion Rule for Content 2: Check for the financial goal list pattern.
  // e.g., "- **Achieve $1,000/Month in Passive Income** - $0 / $267,000 (0% complete)"
  const financialGoalPattern = /-\s\*\*.*\*\*\s-\s\$[\d,]+\s\/\s\$[\d,]+/;
  if (financialGoalPattern.test(content)) {
    // This looks like Content 2. Return a simple structure and skip detailed parsing.
    return {
      shortContent: content.split('\n')[0], // Return the first line as a summary
      sections: [],
      hasLongContent: false, // Indicate that this shouldn't be expanded
    };
  }

  // Exclusion Rule for Content 3: Check for a short message that is primarily a list of questions.
  // e.g., "1. **What is the name of this new goal?**"
  const isListOfQuestions = (str: string) => {
    const lines = str.trim().split('\n');
    const questionLines = lines.filter(line => /^\d+\..*\?$/.test(line.trim()));
    return lines.length > 2 && questionLines.length / lines.length > 0.5; // If >50% of lines are questions in a list
  };
  if (content.length < 700 && isListOfQuestions(content)) {
     // This looks like Content 3. Return a simple structure.
     return {
      shortContent: content,
      sections: [],
      hasLongContent: false,
    };
  }
  
  // --- Main Parsing Logic for Content 1 ---

  const sections: MessageSection[] = [];
  let shortContent = '';
  
  // Split on H3 markdown headers (###), which is the primary structure for Content 1.
  const parts = content.split(/^### /gm);
  
  if (parts.length > 1) {
    // The first part is the intro before any ### sections.
    shortContent = parts[0].trim();
    
    // Process each ### section.
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const lines = part.split('\n');
      const title = lines[0]?.trim() || '';
      // Re-join the rest of the lines to form the content, then find subsections.
      const sectionContent = lines.slice(1).join('\n').trim();
      
      if (title && sectionContent) {
        sections.push({
          title,
          content: sectionContent,
          subsections: parseSubsections(sectionContent)
        });
      }
    }
  }

  // Fallback for sections that don't use ### but use bolded titles (like "General Considerations").
  const boldHeaderPattern = /\n\*\*([^*]+?):\*\*\s*\n([\s\S]*?)(?=\n\*\*|$)/g;
  let match;
  while ((match = boldHeaderPattern.exec(content)) !== null) {
    const title = match[1].trim();
    const sectionContent = match[2].trim();

    // Avoid re-adding titles that are already part of ### sections.
    const alreadyExists = sections.some(sec => sec.content.includes(sectionContent));
    
    if (!alreadyExists && title && sectionContent) {
       sections.push({
        title,
        content: sectionContent,
        subsections: parseSubsections(sectionContent)
      });
    }
  }

  // If no sections were parsed but the content is long, it's not a format we can structure.
  // However, if we still have no shortContent, create a summary.
  if (sections.length > 0 && !shortContent) {
      const firstParagraph = content.split('\n\n')[0];
      shortContent = firstParagraph;
  }

  // If after all parsing, no sections were found, it's not the format we are looking for.
  // Treat it as a simple message.
  if (sections.length === 0) {
      return {
          shortContent: content,
          sections: [],
          hasLongContent: false,
      }
  }
  
  return {
    shortContent: shortContent || sections[0].title, // Fallback shortContent
    sections,
    hasLongContent: sections.length > 0,
  };
}


/**
 * Parses subsections within a larger content block.
 * Looks for numbered lists with bold titles or bullet points with bold titles.
 * @param content The content of a single section.
 * @returns An array of found subsections.
 */
function parseSubsections(content: string): { title: string; content: string; }[] {
  const subsections: { title: string; content: string; }[] = [];
  
  // Pattern for numbered items like "1. **Check with Your Employer/HR Department:**"
  // This is a key structure in Content 1.
  const numberedPattern = /^(\d+)\.\s+\*\*([^*]+?):\*\*\s*([\s\S]*?)(?=(^\d+\.\s+\*\*|\Z))/gm;
  const numberedMatches = [...content.matchAll(numberedPattern)];
  
  if (numberedMatches.length > 0) {
    for (const match of numberedMatches) {
      subsections.push({
        title: match[2].trim(),
        content: match[3].trim()
      });
    }
    return subsections;
  }
  
  // Pattern for bullet points with bold titles like "*   **Consistency is Key:**"
  const bulletActionPattern = /^\*\s+\*\*([^*]+?):\*\*\s*([\s\S]*?)(?=(^\*\s+\*\*|\Z))/gm;
  const bulletMatches = [...content.matchAll(bulletActionPattern)];
  
  if (bulletMatches.length > 0) {
    for (const match of bulletMatches) {
      subsections.push({
        title: match[1].trim(),
        content: match[2].trim()
      });
    }
    return subsections;
  }
  
  return subsections;
}
// Helper function to format content for display
export function formatSectionContent(content: string): string {
  const formatted = content
    .replace(/^\s*\*\s*/gm, '• ') // Convert * bullets to • bullets
    .replace(/^\s*-\s*/gm, '• ') // Convert - bullets to • bullets
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
    .trim();
  return formatted;
}