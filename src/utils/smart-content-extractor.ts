/**
 * Smart Content Extractor
 * Intelligently extracts detailed content sections from messages to improve UX
 */

export interface DetailSection {
  id: string;
  title: string;
  content: string;
  type: 'action_steps' | 'code' | 'list' | 'explanation' | 'example' | 'table' | 'quote';
  priority: number;
  confidence: number;
}

export interface ExtractionMetadata {
  originalLength: number;
  summaryLength: number;
  compressionRatio: number;
  extractionConfidence: number;
  sectionsExtracted: number;
  processingTime: number;
}

export interface ExtractedContent {
  summary: string;
  details: DetailSection[];
  metadata: ExtractionMetadata;
  shouldShowDetails: boolean;
}

// Pattern recognition rules for different content types
export const EXTRACTION_PATTERNS = {
  // Headers (markdown style)
  headers: /^#{1,6}\s+(.+)$/gm,
  
  // Action items and numbered steps
  actionSteps: /^(\d+)\.\s*\*\*([^*]+)\*\*:?\s*(.+)$/gm,
  simpleSteps: /^(\d+)\.\s+(.+)$/gm,
  
  // Lists (bullet points and numbered)
  bulletPoints: /^[\*\-\+]\s+(.+)$/gm,
  numberedLists: /^(\d+)\.\s+(.+)$/gm,
  
  // Code blocks
  codeBlocks: /```[\s\S]*?```/g,
  inlineCode: /`[^`\n]+`/g,
  
  // Tables
  tables: /^\|.+\|$/gm,
  
  // Quotes and callouts
  blockQuotes: /^>\s+(.+)$/gm,
  
  // Detailed explanations patterns
  detailPatterns: /\*\*(Why|Action|Impact|Note|Important|Details?|Example|Warning|Tip):\*\*/gi,
  
  // Technical specifications and configurations
  specifications: /(?:Configure|Set up|Install|Create|Update|Modify|Add|Remove)\s+.{30,}/gi,
  
  // Interactive elements that should be preserved in summary
  interactiveElements: /``[A-Z_]+(?::[^`]+)?``/g,
};

// Contextual extraction rules
export const EXTRACTION_RULES = {
  // Minimum thresholds for extraction
  minSectionLength: 120,
  maxSummaryLength: 400,
  minListItems: 3,
  minCodeLines: 2,
  
  // Content that should always be extracted
  mustExtract: [
    /^#{2,}\s+/m,           // Sub-headers
    /Step \d+:/i,           // Step instructions
    /Instructions?:/i,       // Instruction sections  
    /Configuration:/i,       // Config sections
    /Implementation:/i,      // Implementation details
    /Example:/i,            // Examples
    /```[\s\S]{100,}```/,   // Large code blocks
  ],
  
  // Content that should never be extracted (keep in summary)
  neverExtract: [
    /^(Hi|Hello|Hey|Thanks|Thank you)/i,
    /\?$/,                  // Questions
    /^.{0,80}$/,           // Very short content
    /``[A-Z_]+/,           // Interactive elements
  ],
  
  // Weight factors for different content types
  weights: {
    bulletPoints: 1.5,
    numberedLists: 2.0,
    actionSteps: 2.5,
    codeBlocks: 1.8,
    tables: 1.7,
    headers: 1.3,
    detailPatterns: 2.0,
  },
};

interface SectionFeatures {
  length: number;
  lineCount: number;
  wordCount: number;
  hasBullets: boolean;
  hasNumbers: boolean;
  hasCode: boolean;
  hasHeaders: boolean;
  hasTable: boolean;
  hasInteractive: boolean;
  sentenceCount: number;
  avgWordLength: number;
  indentationLevel: number;
  technicalDensity: number;
}

class SectionClassifier {
  private readonly technicalWords = new Set([
    'configure', 'install', 'setup', 'implement', 'deploy', 'database', 'api', 'server',
    'client', 'function', 'method', 'class', 'component', 'service', 'endpoint', 'schema',
    'migration', 'query', 'authentication', 'authorization', 'validation', 'testing'
  ]);

  extractFeatures(section: string): SectionFeatures {
    const lines = section.split('\n');
    const words = section.split(/\s+/).filter(w => w.length > 0);
    
    return {
      length: section.length,
      lineCount: lines.length,
      wordCount: words.length,
      hasBullets: EXTRACTION_PATTERNS.bulletPoints.test(section),
      hasNumbers: EXTRACTION_PATTERNS.numberedLists.test(section),
      hasCode: EXTRACTION_PATTERNS.codeBlocks.test(section) || EXTRACTION_PATTERNS.inlineCode.test(section),
      hasHeaders: EXTRACTION_PATTERNS.headers.test(section),
      hasTable: EXTRACTION_PATTERNS.tables.test(section),
      hasInteractive: EXTRACTION_PATTERNS.interactiveElements.test(section),
      sentenceCount: section.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
      avgWordLength: words.reduce((sum, word) => sum + word.length, 0) / Math.max(words.length, 1),
      indentationLevel: this.detectIndentation(section),
      technicalDensity: this.calculateTechnicalDensity(section),
    };
  }

  private detectIndentation(section: string): number {
    const lines = section.split('\n');
    let totalIndent = 0;
    let indentedLines = 0;
    
    lines.forEach(line => {
      const match = line.match(/^(\s*)/);
      if (match && match[1].length > 0) {
        totalIndent += match[1].length;
        indentedLines++;
      }
    });
    
    return indentedLines > 0 ? totalIndent / indentedLines : 0;
  }

  private calculateTechnicalDensity(section: string): number {
    const words = section.toLowerCase().split(/\s+/);
    const technicalCount = words.filter(word => this.technicalWords.has(word)).length;
    return technicalCount / Math.max(words.length, 1);
  }

  classifySection(section: string): { type: DetailSection['type']; confidence: number } {
    const features = this.extractFeatures(section);
    
    // Score different section types
    const scores = {
      action_steps: this.scoreActionSteps(features, section),
      code: this.scoreCode(features, section),
      list: this.scoreList(features, section),
      explanation: this.scoreExplanation(features, section),
      example: this.scoreExample(features, section),
      table: this.scoreTable(features, section),
      quote: this.scoreQuote(features, section),
    };

    // Find highest scoring type
    const entries = Object.entries(scores);
    const [bestType, bestScore] = entries.reduce((max, current) => 
      current[1] > max[1] ? current : max
    );

    return {
      type: bestType as DetailSection['type'],
      confidence: Math.min(bestScore, 1.0),
    };
  }

  private scoreActionSteps(features: SectionFeatures, section: string): number {
    let score = 0;
    
    if (EXTRACTION_PATTERNS.actionSteps.test(section)) score += 0.8;
    if (EXTRACTION_PATTERNS.simpleSteps.test(section)) score += 0.6;
    if (features.hasNumbers) score += 0.4;
    if (section.includes('Step') || section.includes('step')) score += 0.3;
    if (features.technicalDensity > 0.1) score += 0.2;
    if (features.lineCount > 3) score += 0.1;
    
    return score;
  }

  private scoreCode(features: SectionFeatures, section: string): number {
    let score = 0;
    
    if (features.hasCode) score += 0.9;
    if (features.avgWordLength > 8) score += 0.2; // Technical terms tend to be longer
    if (features.technicalDensity > 0.15) score += 0.3;
    if (features.lineCount > 2 && section.includes('```')) score += 0.4;
    
    return score;
  }

  private scoreList(features: SectionFeatures, section: string): number {
    let score = 0;
    
    if (features.hasBullets) score += 0.7;
    if (features.hasNumbers && !EXTRACTION_PATTERNS.actionSteps.test(section)) score += 0.6;
    if (features.lineCount > 3) score += 0.2;
    if (features.indentationLevel > 0) score += 0.1;
    
    return score;
  }

  private scoreExplanation(features: SectionFeatures, section: string): number {
    let score = 0;
    
    if (EXTRACTION_PATTERNS.detailPatterns.test(section)) score += 0.8;
    if (features.sentenceCount > 2) score += 0.3;
    if (features.length > 150) score += 0.2;
    if (section.includes('because') || section.includes('therefore') || section.includes('however')) score += 0.2;
    
    return score;
  }

  private scoreExample(features: SectionFeatures, section: string): number {
    let score = 0;
    
    if (/example/i.test(section)) score += 0.7;
    if (/for instance|such as|e\.g\./i.test(section)) score += 0.5;
    if (features.hasCode) score += 0.3;
    if (features.technicalDensity > 0.1) score += 0.2;
    
    return score;
  }

  private scoreTable(features: SectionFeatures, section: string): number {
    let score = 0;
    
    if (features.hasTable) score += 0.9;
    if (section.includes('|') && features.lineCount > 2) score += 0.5;
    
    return score;
  }

  private scoreQuote(features: SectionFeatures, section: string): number {
    let score = 0;
    
    if (EXTRACTION_PATTERNS.blockQuotes.test(section)) score += 0.8;
    if (section.startsWith('>')) score += 0.6;
    
    return score;
  }
}

class SummaryGenerator {
  generateSummary(content: string, extractedDetails: DetailSection[]): string {
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    const summary: string[] = [];
    
    // Always include first paragraph if it's introductory
    if (paragraphs.length > 0 && this.isIntroductory(paragraphs[0])) {
      summary.push(paragraphs[0].trim());
    }
    
    // Extract key points from remaining content
    const keyPoints = this.extractKeyPoints(content, extractedDetails);
    if (keyPoints) {
      summary.push(keyPoints);
    }

    
    let result = summary.join('\n\n');
    
    // Ensure summary isn't too long
    if (result.length > EXTRACTION_RULES.maxSummaryLength) {
      result = this.truncateToSentence(result, EXTRACTION_RULES.maxSummaryLength);
    }
    
    return result;
  }

  private isIntroductory(paragraph: string): boolean {
    const intro_patterns = [
      /^(Here's|Here are|This is|This will|Let me|I'll|We'll|To)/i,
      /^(Welcome|Hello|Hi)/i,
      /^(Based on|According to|Given)/i,
    ];
    
    return intro_patterns.some(pattern => pattern.test(paragraph.trim()));
  }

  private extractKeyPoints(content: string, extractedDetails: DetailSection[]): string | null {
    // Find main headers that weren't extracted
    const headerMatches = Array.from(content.matchAll(EXTRACTION_PATTERNS.headers));
    const extractedTitles = new Set(extractedDetails.map(d => d.title));
    
    const keyHeaders = headerMatches
      .filter(match => !extractedTitles.has(match[1]))
      .slice(0, 3)
      .map(match => `• ${match[1]}`);
    
    if (keyHeaders.length > 0) {
      return `**Key Topics:**\n${keyHeaders.join('\n')}`;
    }
    
    return null;
  }

  private generateNavigationHint(details: DetailSection[]): string {
    const typeGroups = details.reduce((acc, detail) => {
      acc[detail.type] = (acc[detail.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const typeDescriptions = Object.entries(typeGroups).map(([type, count]) => {
      const label = this.getTypeLabel(type);
      return count > 1 ? `${count} ${label}s` : `1 ${label}`;
    });
    
    return `📋 **View Details** for: ${typeDescriptions.join(', ')}`;
  }

  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      action_steps: 'step guide',
      code: 'code block',
      list: 'detailed list',
      explanation: 'explanation',
      example: 'example',
      table: 'table',
      quote: 'quote',
    };
    return labels[type] || type;
  }

  private truncateToSentence(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );
    
    if (lastSentenceEnd > maxLength * 0.7) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }
    
    return truncated + '...';
  }
}

export class ContentExtractor {
  private classifier = new SectionClassifier();
  private summaryGenerator = new SummaryGenerator();

  // Helper method to create empty result on errors
  private createEmptyResult(originalLength: number, startTime: number): ExtractedContent {
    return {
      summary: '', // Will be filled with original content
      details: [],
      metadata: {
        originalLength,
        summaryLength: originalLength,
        compressionRatio: 0,
        extractionConfidence: 0,
        sectionsExtracted: 0,
        processingTime: performance.now() - startTime,
      },
      shouldShowDetails: false,
    };
  }

  extract(content: string): ExtractedContent {
    const startTime = performance.now();
    const originalLength = content.length;
    
    // Skip extraction for very short content
    if (originalLength < 200) {
      return {
        summary: content,
        details: [],
        metadata: {
          originalLength,
          summaryLength: originalLength,
          compressionRatio: 0,
          extractionConfidence: 0,
          sectionsExtracted: 0,
          processingTime: performance.now() - startTime,
        },
        shouldShowDetails: false,
      };
    }
    
    // Add protection against infinite loops
    const maxProcessingTime = 5000; // 5 seconds max
    let processingTimeCheck = startTime;
    
    // Skip if content has interactive elements that should stay visible
    if (this.hasEssentialInteractiveElements(content)) {
      return {
        summary: content,
        details: [],
        metadata: {
          originalLength,
          summaryLength: originalLength,
          compressionRatio: 0,
          extractionConfidence: 0,
          sectionsExtracted: 0,
          processingTime: performance.now() - startTime,
        },
        shouldShowDetails: false,
      };
    }
    
    // Skip if content has course cards (should be preserved as-is)
    if (this.hasCourseCards(content)) {
      return {
        summary: content,
        details: [],
        metadata: {
          originalLength,
          summaryLength: originalLength,
          compressionRatio: 0,
          extractionConfidence: 0,
          sectionsExtracted: 0,
          processingTime: performance.now() - startTime,
        },
        shouldShowDetails: false,
      };
    }

    // Parse content into potential sections with error handling
    let sections: Array<{ content: string; title?: string }>;
    try {
      sections = this.parseContent(content);
    } catch (error) {
      console.warn('Smart extractor: Content parsing failed', error);
      return this.createEmptyResult(originalLength, startTime);
    }
    
    // Classify and score each section with error handling
    const extractionCandidates: Array<{
      content: string;
      title?: string;
      classification: { type: DetailSection['type']; confidence: number };
      extractionScore: number;
    }> = [];
    
    for (const section of sections) {
      // Check processing time periodically
      processingTimeCheck = performance.now();
      if (processingTimeCheck - startTime > maxProcessingTime) {
        console.warn('Smart extractor: Processing timeout, returning partial results');
        break;
      }
      
      try {
        const classification = this.classifier.classifySection(section.content);
        const extractionScore = this.calculateExtractionScore(section.content);
        
        if (extractionScore > 0.5) { // Only extract if confident
          extractionCandidates.push({
            ...section,
            classification,
            extractionScore,
          });
        }
      } catch (error) {
        console.warn('Smart extractor: Section classification failed', error);
        continue; // Skip this section and continue with others
      }
    }
    
    // Create detailed sections
    const details: DetailSection[] = extractionCandidates.map((candidate, index) => ({
      id: `detail-${index}`,
      title: candidate.title || this.generateSectionTitle(candidate.content, candidate.classification.type),
      content: candidate.content,
      type: candidate.classification.type,
      priority: candidate.extractionScore,
      confidence: candidate.classification.confidence,
    }));
    
    // Generate summary with error handling
    let summary: string;
    try {
      summary = this.summaryGenerator.generateSummary(content, details);
    } catch (error) {
      console.warn('Smart extractor: Summary generation failed, using truncated content', error);
      summary = content.length > 400 ? content.substring(0, 400) + '...' : content;
    }
    const summaryLength = summary.length;
    
    const metadata: ExtractionMetadata = {
      originalLength,
      summaryLength,
      compressionRatio: details.length > 0 ? (originalLength - summaryLength) / originalLength : 0,
      extractionConfidence: details.reduce((sum, d) => sum + d.confidence, 0) / Math.max(details.length, 1),
      sectionsExtracted: details.length,
      processingTime: performance.now() - startTime,
    };
    
    return {
      summary,
      details,
      metadata,
      shouldShowDetails: details.length > 0 && metadata.compressionRatio > 0.2,
    };
  }

  private hasEssentialInteractiveElements(content: string): boolean {
    // Count interactive elements
    const interactiveMatches = content.match(EXTRACTION_PATTERNS.interactiveElements) || [];
    const contentSections = content.split('\n\n').length;
    
    // If >50% of sections have interactive elements, keep everything in summary
    return interactiveMatches.length / contentSections > 0.5;
  }

  private hasCourseCards(content: string): boolean {
    // Check for HTML course cards (backend now sends HTML format directly)
    return content.includes('<course-card');
  }

  private parseContent(content: string): Array<{ content: string; title?: string }> {
    const sections: Array<{ content: string; title?: string }> = [];
    const paragraphs = content.split('\n\n');
    
    let currentSection: { content: string; title?: string } = { content: '' };
    
    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;
      
      // Check if this paragraph is a header
      const headerMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
      if (headerMatch) {
        // Save previous section if it has content
        if (currentSection.content.trim()) {
          sections.push(currentSection);
        }
        // Start new section
        currentSection = {
          content: '',
          title: headerMatch[1],
        };
      } else {
        // Add to current section
        if (currentSection.content) {
          currentSection.content += '\n\n' + trimmed;
        } else {
          currentSection.content = trimmed;
        }
      }
    }
    
    // Add final section
    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }
    
    // If no headers found, treat as single section
    if (sections.length === 0) {
      sections.push({ content: content.trim() });
    }
    
    return sections;
  }

  private calculateExtractionScore(section: string): number {
    let score = 0;
    
    // Check against must-extract patterns
    for (const pattern of EXTRACTION_RULES.mustExtract) {
      if (pattern.test(section)) {
        score += 0.8;
        break;
      }
    }
    
    // Check against never-extract patterns  
    for (const pattern of EXTRACTION_RULES.neverExtract) {
      if (pattern.test(section)) {
        return 0; // Never extract
      }
    }
    
    // Length-based scoring
    if (section.length > EXTRACTION_RULES.minSectionLength) {
      score += 0.3;
    }
    
    // Pattern-based scoring
    if (EXTRACTION_PATTERNS.bulletPoints.test(section)) {
      const bulletCount = (section.match(EXTRACTION_PATTERNS.bulletPoints) || []).length;
      if (bulletCount >= EXTRACTION_RULES.minListItems) {
        score += 0.4 * Math.min(bulletCount / 5, 1);
      }
    }
    
    if (EXTRACTION_PATTERNS.codeBlocks.test(section)) {
      score += 0.5;
    }
    
    if (EXTRACTION_PATTERNS.actionSteps.test(section)) {
      score += 0.6;
    }
    
    if (EXTRACTION_PATTERNS.tables.test(section)) {
      score += 0.4;
    }
    
    return Math.min(score, 1.0);
  }

  private generateSectionTitle(content: string, type: DetailSection['type']): string {
    // Try to extract title from first line
    const firstLine = content.split('\n')[0].trim();
    
    // Check for explicit titles
    const headerMatch = firstLine.match(/^#+\s*(.+)$/);
    if (headerMatch) {
      return headerMatch[1];
    }
    
    // Check for action step titles
    const stepMatch = firstLine.match(/^\d+\.\s*\*\*([^*]+)\*\*/);
    if (stepMatch) {
      return stepMatch[1];
    }
    
    // Generate title based on type and content
    switch (type) {
      case 'action_steps':
        const stepCount = (content.match(/^\d+\./gm) || []).length;
        return `${stepCount} Action Steps`;
      case 'code':
        return 'Code Example';
      case 'list':
        const listItems = (content.match(/^[\*\-\+]/gm) || []).length;
        return `${listItems} Key Points`;
      case 'table':
        return 'Data Table';
      case 'example':
        return 'Example';
      case 'quote':
        return 'Quote';
      case 'explanation':
      default:
        // Use first few words as title
        const words = firstLine.replace(/[*#`]/g, '').trim().split(/\s+/).slice(0, 4);
        return words.join(' ') + (words.length < firstLine.split(/\s+/).length ? '...' : '');
    }
  }
}

// Main extraction function with comprehensive error handling
export function smartExtractContent(content: string): ExtractedContent {
  // Input validation
  if (!content || typeof content !== 'string') {
    console.warn('Smart extractor: Invalid content input');
    return createFallbackResult(content || '');
  }

  // Length validation
  if (content.length > 100000) { // 100KB limit
    console.warn('Smart extractor: Content too large, truncating');
    content = content.substring(0, 100000) + '\n\n[Content truncated for performance]';
  }

  try {
    const extractor = new ContentExtractor();
    
    // Pre-process content with error handling
    let preprocessed: string;
    try {
      preprocessed = content
        .replace(/\n{3,}/g, '\n\n') // Normalize whitespace
        .replace(/\t/g, '    ')     // Convert tabs to spaces
        .trim();
    } catch (error) {
      console.warn('Smart extractor: Preprocessing failed, using original content', error);
      preprocessed = content;
    }
    
    // Extract content (with potential for async timeout in the future)
    const extracted = extractor.extract(preprocessed);
    
    // Post-process optimization with error handling
    try {
      return optimizeExtraction(extracted);
    } catch (error) {
      console.warn('Smart extractor: Optimization failed, using raw extraction', error);
      return extracted;
    }
    
  } catch (error) {
    console.error('Smart extractor: Complete failure, returning fallback', error);
    return createFallbackResult(content);
  }
}

// Create fallback result when extraction fails
function createFallbackResult(content: string): ExtractedContent {
  return {
    summary: content,
    details: [],
    metadata: {
      originalLength: content.length,
      summaryLength: content.length,
      compressionRatio: 0,
      extractionConfidence: 0,
      sectionsExtracted: 0,
      processingTime: 0,
    },
    shouldShowDetails: false,
  };
}

function optimizeExtraction(extracted: ExtractedContent): ExtractedContent {
  // If summary is too short and we have low-priority details, move some back
  if (extracted.summary.length < 100 && extracted.details.length > 0) {
    const sortedDetails = [...extracted.details].sort((a, b) => a.priority - b.priority);
    const leastImportant = sortedDetails[0];
    
    if (leastImportant && leastImportant.content.length < 200) {
      extracted.summary += '\n\n' + leastImportant.content;
      extracted.details = extracted.details.filter(d => d.id !== leastImportant.id);
      
      // Recalculate metadata
      extracted.metadata.summaryLength = extracted.summary.length;
      extracted.metadata.sectionsExtracted = extracted.details.length;
      extracted.metadata.compressionRatio = 
        (extracted.metadata.originalLength - extracted.metadata.summaryLength) / extracted.metadata.originalLength;
    }
  }
  
  return extracted;
}