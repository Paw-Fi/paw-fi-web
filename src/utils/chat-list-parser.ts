export interface ListItem {
  content: string;
  index?: number;
}

export interface ListSection {
  id: string;
  type: 'numbered' | 'bullet' | 'section';
  items: ListItem[];
  title?: string;
  description?: string;
  originalText: string;
}

export interface ParsedMessage {
  processedContent: string;
  extractedLists: ListSection[];
}

/**
 * Parses markdown content to extract lists and structured sections, replacing them with clickable summaries
 */
export function parseMessageForLists(content: string): ParsedMessage {
  let contentWithSections = content;
  const extractedLists: ListSection[] = [];
  
  // Enhanced patterns to detect various section types
  const patterns = [
    // Option sections (like "Option 1: If You Have a Workplace Pension")
    {
      regex: /(Option \d+: [^\n]+)\n\n([\s\S]*?)(?=\n\nOption \d+:|\n\n\*\*Next Steps|$)/g,
      type: 'option-section' as const
    },
    // "Next Steps" sections - more comprehensive pattern
    {
      regex: /(\*\*Next Steps:\*\*|Next Steps:)([\s\S]*?)(?=\n\n\*\*|\n\nOption|$)/g,
      type: 'next-steps' as const
    },
    // Numbered sections with descriptions and lists
    {
      regex: /(\d+\.)\s*\*\*([^*]+)\*\*([\s\S]*?)(?=\n\n|\d+\.|\*\*Next Steps|$)/g,
      type: 'numbered-section' as const
    },
    // Major headings with content (### or ##)
    {
      regex: /(#{2,3})\s*([^\n]+)\n([\s\S]*?)(?=\n#{2,3}|\n\n\*\*|$)/g,
      type: 'heading-section' as const
    },
    // Bold section titles with content
    {
      regex: /\*\*([^*]+)\*\*\n([\s\S]*?)(?=\n\n\*\*|\n\n\d+\.|$)/g,
      type: 'bold-section' as const
    }
  ];
  
  // After processing sections, clean up any remaining orphaned fragments
  const cleanupPatterns = [
    // Remove specific broken fragments that appear after section processing
    /^\s*\d+\.\s*\*Check with Your Em.*$/gm,
    // Remove any line containing just "*Check with Your Em" (with or without numbers)
    /^.*\*Check with Your Em.*$/gm,
    // Remove incomplete sentences ending with "pr" (like "...stated pr")
    /^.*that align with your stated pr\s*$/gm,
    // Remove standalone "Once your monthly contributions" fragments
    /^Once your monthly contributions are set up, the next critical step is to select the investments within your pension that align with your stated pr\s*$/gm,
    // Remove any asterisk fragments that are clearly truncated (less than 15 chars after asterisk)
    /^\s*\*[^\n]{1,15}\s*$/gm,
    // Remove lines that end with incomplete words like "Em", "pr", "con", "inv"
    /^.*\s+(Em|pr|con|inv|pen)\s*$/gm
  ];
  
  patterns.forEach((pattern, patternIndex) => {
    const matches = [...content.matchAll(pattern.regex)];
    
    matches.forEach((match, matchIndex) => {
      const fullMatch = match[0];
      let title = '';
      let description = '';
      let sectionContent = fullMatch;
      
      switch (pattern.type) {
        case 'option-section':
          title = match[1].trim();
          description = match[2].trim().substring(0, 150);
          break;
        case 'numbered-section':
          title = `${match[1]} ${match[2].trim()}`;
          description = match[3].trim().substring(0, 150);
          break;
        case 'next-steps':
          title = 'Next Steps';
          description = match[2].trim().substring(0, 150);
          break;
        case 'heading-section':
          title = match[2].trim();
          description = match[3].trim().substring(0, 150);
          break;
        case 'bold-section':
          title = match[1].trim();
          description = match[2].trim().substring(0, 150);
          break;
      }
      
      // Check if this section has meaningful content (lists, multiple paragraphs, etc.)
      const hasLists = /^\s*(\d+\.|[\-\*\+])\s/m.test(sectionContent);
      const hasMultipleParagraphs = (sectionContent.match(/\n\n/g) || []).length > 0;
      const isSubstantial = sectionContent.length > 200;
      
      if ((hasLists || hasMultipleParagraphs || isSubstantial) && title && description) {
        const sectionId = `section-${extractedLists.length}`;
        
        extractedLists.push({
          id: sectionId,
          type: 'section',
          title,
          description: description.length > 100 ? description.substring(0, 100) + '...' : description,
          items: [],
          originalText: sectionContent
        });
        
        // Create appropriate card placeholder based on section type
        let icon = '📋';
        if (pattern.type === 'next-steps') icon = '🚀';
        else if (pattern.type === 'numbered-section') icon = '🔢';
        else if (pattern.type === 'heading-section') icon = '📝';
        else if (pattern.type === 'option-section') icon = '⚡';
        
        const cardPlaceholder = `\n**[${icon} ${title}](#${sectionId})**\n*${description}*\n`;
        contentWithSections = contentWithSections.replace(sectionContent, cardPlaceholder);
      }
    });
  });
  
  // Apply cleanup patterns to remove orphaned fragments
  cleanupPatterns.forEach(pattern => {
    contentWithSections = contentWithSections.replace(pattern, '');
  });
  
  // Clean up extra whitespace and empty lines
  contentWithSections = contentWithSections.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
  
  // Now parse remaining lists in the modified content
  const lines = contentWithSections.split('\n');
  const processedLines: string[] = [];
  
  let currentListSection: {
    type: 'numbered' | 'bullet';
    items: ListItem[];
    startIndex: number;
    originalLines: string[];
  } | null = null;
  
  // Regex patterns for different list types
  const numberedListPattern = /^(\s*)((\d+\.)|(\d+\))|(\w+\.\s)|(\w+\)\s))\s+(.+)/;
  const bulletListPattern = /^(\s*)([•\-\*\+])\s+(.+)/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines within lists
    if (currentListSection && trimmedLine === '') {
      currentListSection.originalLines.push(line);
      continue;
    }
    
    // Check for numbered list
    const numberedMatch = trimmedLine.match(numberedListPattern);
    if (numberedMatch) {
      const content = numberedMatch[7];
      
      if (!currentListSection || currentListSection.type !== 'numbered') {
        // Start new numbered list section
        if (currentListSection) {
          // Save previous list section
          finalizeListSection(currentListSection, extractedLists, processedLines);
        }
        currentListSection = {
          type: 'numbered',
          items: [],
          startIndex: i,
          originalLines: []
        };
      }
      
      currentListSection.items.push({
        content: content.trim(),
        index: currentListSection.items.length + 1
      });
      currentListSection.originalLines.push(line);
      continue;
    }
    
    // Check for bullet list
    const bulletMatch = trimmedLine.match(bulletListPattern);
    if (bulletMatch) {
      const content = bulletMatch[3];
      
      if (!currentListSection || currentListSection.type !== 'bullet') {
        // Start new bullet list section
        if (currentListSection) {
          // Save previous list section
          finalizeListSection(currentListSection, extractedLists, processedLines);
        }
        currentListSection = {
          type: 'bullet',
          items: [],
          startIndex: i,
          originalLines: []
        };
      }
      
      currentListSection.items.push({
        content: content.trim()
      });
      currentListSection.originalLines.push(line);
      continue;
    }
    
    // If we reach here and have a current list section, finalize it
    if (currentListSection) {
      finalizeListSection(currentListSection, extractedLists, processedLines);
      currentListSection = null;
    }
    
    // Add regular line to processed content
    processedLines.push(line);
  }
  
  // Finalize any remaining list section
  if (currentListSection) {
    finalizeListSection(currentListSection, extractedLists, processedLines);
  }
  
  return {
    processedContent: processedLines.join('\n'),
    extractedLists
  };
}

function finalizeListSection(
  listSection: {
    type: 'numbered' | 'bullet';
    items: ListItem[];
    startIndex: number;
    originalLines: string[];
  },
  extractedLists: ListSection[],
  processedLines: string[]
) {
  // Only extract lists with 2 or more items to avoid extracting single items
  if (listSection.items.length >= 2) {
    const listId = `list-${extractedLists.length}`;
    const originalText = listSection.originalLines.join('\n');
    
    // Determine appropriate summary text based on list type and content
    const summaryText = generateSummaryText(listSection.type, listSection.items);
    
    extractedLists.push({
      id: listId,
      type: listSection.type,
      items: listSection.items,
      originalText,
      title: listSection.type === 'numbered' ? 'Step-by-Step Guide' : 'Key Points'
    });
    
    // Add clickable summary to processed content
    processedLines.push(`\n**[${summaryText}](#${listId})**\n`);
  } else {
    // If list has only 1 item, keep it as regular content
    processedLines.push(...listSection.originalLines);
  }
}

function generateSummaryText(type: 'numbered' | 'bullet', items: ListItem[]): string {
  const itemCount = items.length;
  
  if (type === 'numbered') {
    // Analyze content to determine context
    const firstItem = items[0]?.content.toLowerCase() || '';
    
    if (firstItem.includes('step') || firstItem.includes('first') || firstItem.includes('start')) {
      return `View ${itemCount} detailed steps`;
    } else if (firstItem.includes('action') || firstItem.includes('do') || firstItem.includes('complete')) {
      return `View ${itemCount} action items`;
    } else {
      return `View ${itemCount} detailed points`;
    }
  } else {
    // Bullet list
    const firstItem = items[0]?.content.toLowerCase() || '';
    
    if (firstItem.includes('benefit') || firstItem.includes('advantage')) {
      return `View ${itemCount} key benefits`;
    } else if (firstItem.includes('tip') || firstItem.includes('advice')) {
      return `View ${itemCount} helpful tips`;
    } else if (firstItem.includes('feature') || firstItem.includes('include')) {
      return `View ${itemCount} key features`;
    } else {
      return `View ${itemCount} important points`;
    }
  }
}
