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

export function parseMessageContent(content: string): ParsedMessage {
  const sections: MessageSection[] = [];
  let shortContent = '';
  
  // First, let's manually split on ### sections since they're the main structure
  const parts = content.split(/^### /gm);
  
  if (parts.length > 1) {
    // First part is the intro (before any ###)
    shortContent = parts[0].trim();
    
    // Process each ### section
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const lines = part.split('\n');
      const title = lines[0]?.trim() || '';
      const sectionContent = lines.slice(1).join('\n').trim();
      
      console.log(`Processing section ${i}:`, { title, contentLength: sectionContent.length });
      
      if (title && sectionContent) {
        const subsections = parseSubsections(sectionContent);
        sections.push({
          title,
          content: sectionContent,
          subsections
        });
      }
    }
  }
  
  // After ### sections, also look for bold headers like "**Next Steps:**"
  // Look for bold patterns that come AFTER the ### sections
  const boldHeaderPattern = /\*\*([^*]+?)\*\*:\s*\n?([\s\S]*?)(?=\*\*[^*]+?\*\*:|\Z)/g;
  const boldMatches = [...content.matchAll(boldHeaderPattern)];
  
  console.log('Looking for bold headers, found:', boldMatches.length);
  boldMatches.forEach((match, i) => {
    console.log(`Bold match ${i}:`, {
      title: match[1].trim(),
      content: match[2].trim().substring(0, 100) + '...',
      fullMatch: match[0].substring(0, 150) + '...'
    });
  });
  
  for (const match of boldMatches) {
    const title = match[1].trim();
    const sectionContent = match[2].trim();
    
    console.log('Evaluating bold header:', { title, contentLength: sectionContent.length });
    
    // Skip if this title is already in a ### section (more specific check)
    const alreadyExists = sections.some(section => {
      const sectionWords = section.title.toLowerCase().split(/\s+/);
      const titleWords = title.toLowerCase().split(/\s+/);
      return sectionWords.some(word => titleWords.includes(word)) || 
             titleWords.some(word => sectionWords.includes(word));
    });
    
    console.log('Already exists check:', alreadyExists);
    
    if (!alreadyExists && title && title.length > 3) {
      // For "Next Steps", even if content is minimal, we want to capture it
      const subsections = parseSubsections(sectionContent);
      sections.push({
        title,
        content: sectionContent,
        subsections
      });
      console.log('Added bold header section:', title);
    }
  }
  
  // Special handling for "Next Steps" which might be embedded in the content
  if (!sections.some(s => s.title.toLowerCase().includes('next steps'))) {
    const nextStepsPattern = /\*\*Next Steps:\*\*\s*([\s\S]*?)$/i;
    const nextStepsMatch = content.match(nextStepsPattern);
    
    console.log('Looking for embedded Next Steps...');
    if (nextStepsMatch) {
      console.log('Found Next Steps:', nextStepsMatch[1].substring(0, 100) + '...');
      sections.push({
        title: 'Next Steps',
        content: nextStepsMatch[1].trim(),
        subsections: parseSubsections(nextStepsMatch[1].trim())
      });
    }
  }
  
  // Fallback: if no sections found and content is long, treat as single detailed section
  if (sections.length === 0 && content.length > 1000) {
    const sentences = content.split(/\.\s+/);
    shortContent = sentences.slice(0, 2).join('. ') + '.';
    
    sections.push({
      title: 'Detailed Information',
      content: content,
      subsections: parseSubsections(content)
    });
  }
  
  // If we still don't have short content, extract it
  if (!shortContent && sections.length > 0) {
    const sentences = content.split(/\.\s+/);
    shortContent = sentences.slice(0, 3).join('. ') + '.';
  }
  
  const hasLongContent = sections.length > 0;
  
  const result = {
    shortContent: shortContent || content,
    sections,
    hasLongContent
  };
  
  console.log('=== PARSER DEBUG ===');
  console.log('Input content length:', content.length);
  console.log('Short content:', result.shortContent);
  console.log('Sections found:', result.sections.length);
  console.log('Has long content:', result.hasLongContent);
  result.sections.forEach((section, index) => {
    console.log(`Section ${index}:`, {
      title: section.title,
      contentPreview: section.content.substring(0, 100) + '...',
      contentLength: section.content.length,
      subsectionsCount: section.subsections?.length || 0
    });
  });
  console.log('====================');
  
  return result;
}


function parseSubsections(content: string): { title: string; content: string; }[] {
  const subsections: { title: string; content: string; }[] = [];
  
  console.log('parseSubsections input:', content.substring(0, 200) + '...');
  
  // Pattern 1: Numbered items like "1. **Check with Your Employer/HR Department:**"
  // More flexible pattern to handle various spacing and formatting
  const numberedPattern = /^(\d+)\.[ \t]+\*\*([^*]+?)\*\*:?[ \t]*\n([\s\S]*?)(?=^\d+\.[ \t]+\*\*|$)/gm;
  const numberedMatches = [...content.matchAll(numberedPattern)];
  
  console.log('Found numbered matches:', numberedMatches.length);
  
  if (numberedMatches.length > 0) {
    for (const match of numberedMatches) {
      const title = match[2].trim();
      const subContent = match[3].trim();
      console.log('Numbered subsection:', { title, contentLength: subContent.length });
      subsections.push({
        title,
        content: subContent
      });
    }
    return subsections;
  }
  
  // Alternative pattern for numbered items without bold
  const simpleNumberPattern = /^(\d+)\.[ \t]+([^:\n]+):?[ \t]*\n([\s\S]*?)(?=^\d+\.[ \t]+|$)/gm;
  const simpleMatches = [...content.matchAll(simpleNumberPattern)];
  
  console.log('Found simple numbered matches:', simpleMatches.length);
  
  if (simpleMatches.length > 0) {
    for (const match of simpleMatches) {
      const title = match[2].trim();
      const subContent = match[3].trim();
      console.log('Simple numbered subsection:', { title, contentLength: subContent.length });
      subsections.push({
        title,
        content: subContent
      });
    }
    return subsections;
  }
  
  // Pattern 2: Bullet points with bold titles like "*   **Consistency is Key:**"
  const bulletActionPattern = /^\*[ \t]+\*\*([^*]+?)\*\*:[ \t]*([\s\S]*?)(?=^\*[ \t]+\*\*|$)/gm;
  const bulletMatches = [...content.matchAll(bulletActionPattern)];
  
  console.log('Found bullet matches:', bulletMatches.length);
  
  if (bulletMatches.length > 0) {
    for (const match of bulletMatches) {
      const title = match[1].trim();
      const subContent = match[2].trim();
      console.log('Bullet subsection:', { title, contentLength: subContent.length });
      subsections.push({
        title,
        content: subContent
      });
    }
    return subsections;
  }
  
  // Pattern 3: Simple bullet points without bold
  const simpleBulletPattern = /^\*[ \t]+([^:\n*]+):[ \t]*([\s\S]*?)(?=^\*[ \t]+|$)/gm;
  const simpleBulletMatches = [...content.matchAll(simpleBulletPattern)];
  
  console.log('Found simple bullet matches:', simpleBulletMatches.length);
  
  if (simpleBulletMatches.length > 0) {
    for (const match of simpleBulletMatches) {
      const title = match[1].trim();
      const subContent = match[2].trim();
      console.log('Simple bullet subsection:', { title, contentLength: subContent.length });
      if (title && subContent) {
        subsections.push({
          title,
          content: subContent
        });
      }
    }
    return subsections;
  }
  
  console.log('No subsections found');
  return subsections;
}

// Helper function to format content for display
export function formatSectionContent(content: string): string {
  console.log('formatSectionContent input:', content);
  const formatted = content
    .replace(/^\s*\*\s*/gm, '• ') // Convert * bullets to • bullets
    .replace(/^\s*-\s*/gm, '• ') // Convert - bullets to • bullets
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
    .trim();
  console.log('formatSectionContent output:', formatted);
  return formatted;
}