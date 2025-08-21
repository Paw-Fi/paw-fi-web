# Smart Content Extraction Implementation Guide

## Overview
Create an intelligent extraction function that identifies detailed content sections and separates them from summary content, reducing message length while preserving accessibility through modal popups.

## Core Architecture

### 1. Content Analysis Strategy

```typescript
interface ExtractedContent {
  summary: string;
  details: DetailSection[];
  metadata: {
    originalLength: number;
    compressionRatio: number;
    extractionConfidence: number;
  };
}

interface DetailSection {
  id: string;
  title: string;
  content: string;
  type: 'action_steps' | 'code' | 'list' | 'explanation' | 'example';
  priority: number;
}
```

### 2. Multi-Layer Extraction Algorithm

```typescript
class ContentExtractor {
  // Configurable thresholds
  private readonly config = {
    minSectionLength: 150,        // Min chars to consider for extraction
    maxSummaryLength: 500,         // Max chars for summary
    listItemThreshold: 3,          // Min items to extract list
    codeBlockMinLines: 3,          // Min lines for code extraction
    bulletPointWeight: 1.5,        // Weight for bullet detection
    numberedListWeight: 2.0,       // Weight for numbered lists
  };

  extract(content: string): ExtractedContent {
    // Step 1: Parse and tokenize content
    const sections = this.parseContent(content);
    
    // Step 2: Classify each section
    const classifiedSections = sections.map(s => this.classifySection(s));
    
    // Step 3: Determine what to extract
    const extractionPlan = this.createExtractionPlan(classifiedSections);
    
    // Step 4: Generate summary and details
    return this.generateExtractedContent(extractionPlan);
  }
}
```

### 3. Pattern Recognition Rules

```typescript
const EXTRACTION_PATTERNS = {
  // Section headers (markdown style)
  headers: /^#{1,6}\s+(.+)$/gm,
  
  // Action items and steps
  actionSteps: /^\d+\.\s+\*\*(.+?)\*\*:/gm,
  
  // Bullet points and lists
  bulletPoints: /^[\*\-\+]\s+.+$/gm,
  numberedLists: /^\d+\.\s+.+$/gm,
  
  // Code blocks
  codeBlocks: /```[\s\S]*?```/g,
  
  // Detailed explanations (Why/Action/Impact pattern)
  detailPatterns: /\*\*(Why|Action|Impact|Note|Important|Details?):\*\*/gi,
  
  // Inline lists
  inlineLists: /(?:such as|including|like|e\.g\.|for example)[:，]\s*([^.]+\.)/gi,
  
  // Technical specifications
  specifications: /(?:Consider|Configure|Set up|Install|Create)\s+.{50,}/gi,
};
```

### 4. Intelligent Section Classification

```typescript
class SectionClassifier {
  classifySection(section: string): SectionType {
    const features = this.extractFeatures(section);
    
    // Use weighted scoring
    const scores = {
      action_steps: this.scoreActionSteps(features),
      code: this.scoreCode(features),
      list: this.scoreList(features),
      explanation: this.scoreExplanation(features),
      summary: this.scoreSummary(features),
    };
    
    return this.getHighestScore(scores);
  }
  
  private extractFeatures(section: string) {
    return {
      length: section.length,
      lineCount: section.split('\n').length,
      hasBullets: EXTRACTION_PATTERNS.bulletPoints.test(section),
      hasNumbers: EXTRACTION_PATTERNS.numberedLists.test(section),
      hasCode: EXTRACTION_PATTERNS.codeBlocks.test(section),
      hasHeaders: EXTRACTION_PATTERNS.headers.test(section),
      sentenceCount: section.split(/[.!?]+/).length,
      avgWordLength: this.calculateAvgWordLength(section),
      keywordDensity: this.calculateKeywordDensity(section),
      indentationLevel: this.detectIndentation(section),
    };
  }
}
```

### 5. Summary Generation Strategy

```typescript
class SummaryGenerator {
  generateSummary(content: string, extractedDetails: DetailSection[]): string {
    // Key principles for summary:
    // 1. Keep first paragraph if it's introductory
    // 2. Extract key points from headers
    // 3. Include conclusion if present
    // 4. Add extraction indicators
    
    const summary = [];
    
    // Extract introduction
    const intro = this.extractIntroduction(content);
    if (intro) summary.push(intro);
    
    // Extract key points
    const keyPoints = this.extractKeyPoints(content, extractedDetails);
    summary.push(keyPoints);
    
  
    return summary.join('\n\n');
  }
  
  private generateNavigationHint(details: DetailSection[]): string {
    const types = [...new Set(details.map(d => d.type))];
    return `📋 **Available Details:** ${types.join(', ')} (click "View Details" to expand)`;
  }
}
```

### 6. Contextual Extraction Rules

```typescript
const CONTEXTUAL_RULES = {
  // Always extract if section contains these patterns
  mustExtract: [
    /Step \d+:/i,
    /Instructions?:/i,
    /Configuration:/i,
    /Implementation:/i,
    /Example:/i,
  ],
  
  // Never extract these (keep in summary)
  neverExtract: [
    /^(Hi|Hello|Hey)/i,
    /^(Thanks|Thank you)/i,
    /\?$/,  // Questions
    /^.{0,100}$/,  // Very short content
  ],
  
  // Context-dependent extraction
  conditionalExtract: {
    // Extract lists only if they have 3+ items
    lists: (content: string) => {
      const items = content.match(/^[\*\-\d]+\.\s/gm);
      return items && items.length >= 3;
    },
    
    // Extract code only if substantial
    code: (content: string) => {
      const lines = content.split('\n').length;
      return lines > 3;
    },
  },
};
```

### 7. Implementation Example

```typescript
function smartExtractContent(message: string): ExtractedContent {
  const extractor = new ContentExtractor();
  
  // Pre-processing
  const preprocessed = preprocessContent(message);
  
  // Main extraction
  const extracted = extractor.extract(preprocessed);
  
  // Post-processing optimization
  const optimized = optimizeExtraction(extracted);
  
  return optimized;
}

function preprocessContent(content: string): string {
  // Remove redundant whitespace
  // Normalize markdown formatting
  // Fix encoding issues
  return content
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\t/g, '    ')
    .trim();
}

function optimizeExtraction(extracted: ExtractedContent): ExtractedContent {
  // Ensure summary isn't too short
  if (extracted.summary.length < 100 && extracted.details.length > 0) {
    // Pull some content back from details
    const leastImportant = extracted.details
      .sort((a, b) => a.priority - b.priority)[0];
    
    if (leastImportant && leastImportant.content.length < 200) {
      extracted.summary += '\n\n' + leastImportant.content;
      extracted.details = extracted.details.filter(d => d.id !== leastImportant.id);
    }
  }
  
  return extracted;
}
```

### 8. React Component Integration

```tsx
interface MessageProps {
  content: string;
}

const MessageComponent: React.FC<MessageProps> = ({ content }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedContent | null>(null);
  
  useEffect(() => {
    const result = smartExtractContent(content);
    setExtracted(result);
  }, [content]);
  
  if (!extracted) return <div>Loading...</div>;
  
  return (
    <div className="message">
      <div className="summary">
        {renderMarkdown(extracted.summary)}
      </div>
      
      {extracted.details.length > 0 && (
        <>
          <button 
            onClick={() => setShowDetails(true)}
            className="view-details-btn"
          >
            View Details ({extracted.details.length} sections)
          </button>
          
          <Modal 
            isOpen={showDetails}
            onClose={() => setShowDetails(false)}
          >
            <DetailsView details={extracted.details} />
          </Modal>
        </>
      )}
    </div>
  );
};
```

### 9. Machine Learning Enhancement (Optional)

```typescript
class MLEnhancedExtractor {
  private model: any; // Your ML model
  
  async extractWithML(content: string): Promise<ExtractedContent> {
    // Generate features
    const features = this.generateFeatures(content);
    
    // Predict section importance
    const predictions = await this.model.predict(features);
    
    // Apply predictions to extraction
    return this.applyMLPredictions(content, predictions);
  }
  
  private generateFeatures(content: string) {
    return {
      // Linguistic features
      avgSentenceLength: this.calcAvgSentenceLength(content),
      lexicalDiversity: this.calcLexicalDiversity(content),
      
      // Structural features
      paragraphCount: content.split('\n\n').length,
      hasSubsections: /^#{2,}/m.test(content),
      
      // Semantic features
      technicalTermDensity: this.calcTechnicalDensity(content),
      actionWordCount: this.countActionWords(content),
    };
  }
}
```

### 10. Testing Strategy

```typescript
describe('ContentExtractor', () => {
  it('should extract detailed action steps', () => {
    const input = `
      Here's how to set up:
      1. **Install Dependencies**: Run npm install...
      2. **Configure Settings**: Edit config.json...
      3. **Start Server**: Execute npm start...
    `;
    
    const result = smartExtractContent(input);
    expect(result.details).toHaveLength(1);
    expect(result.details[0].type).toBe('action_steps');
  });
  
  it('should preserve short messages in summary', () => {
    const input = "Thanks for your help!";
    const result = smartExtractContent(input);
    expect(result.summary).toBe(input);
    expect(result.details).toHaveLength(0);
  });
  
  it('should handle mixed content appropriately', () => {
    // Test with your actual sample content
    const result = smartExtractContent(sampleContent);
    expect(result.summary.length).toBeLessThan(500);
    expect(result.details.length).toBeGreaterThan(0);
  });
});
```

## Key Implementation Principles

1. **Progressive Extraction**: Start conservative, extract more as patterns become clear
2. **Context Preservation**: Never break logical connections between related content
3. **User Experience First**: Summary should be self-contained and meaningful
4. **Performance**: Cache extraction results for repeated content
5. **Accessibility**: Ensure extracted content maintains semantic structure
6. **Fallback Strategy**: If extraction confidence is low, keep content in summary

## Configuration Recommendations

```json
{
  "extraction": {
    "aggressive": false,
    "minConfidence": 0.7,
    "maxSummaryLength": 500,
    "preserveFormatting": true,
    "extractCodeBlocks": true,
    "extractLists": true,
    "extractTables": true,
    "keepIntroductions": true,
    "keepConclusions": true
  }
}
```

## Performance Optimization

- Use Web Workers for large content processing
- Implement content hashing for cache management
- Lazy load detailed content only when modal opens
- Stream processing for real-time messages
- Batch processing for historical messages

This implementation provides a robust, intelligent system for extracting detailed content while maintaining readability and user experience.