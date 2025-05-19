import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";

// Define the route for TanStack Router
export const Route = createFileRoute('/format/')({ 
  component: FormatPage 
});

// Format page component
function FormatPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  // Format the input as a JavaScript string
  const formatAsString = () => {
    if (!input) return;

    // Replace newlines with \n and escape quotes
    const formatted = input
      .replace(/\\/g, "\\\\") // Escape backslashes first
      .replace(/"/g, '\\"')   // Escape double quotes
      .replace(/\n/g, "\\n"); // Replace newlines with \n

    // Wrap in double quotes
    setOutput(`"${formatted}"`);
  };

  // Format as a template literal (preserves formatting better)
  const formatAsTemplateLiteral = () => {
    if (!input) return;

    // Escape backticks and interpolation
    const formatted = input
      .replace(/\\/g, "\\\\") // Escape backslashes first
      .replace(/`/g, "\\`")   // Escape backticks
      .replace(/\${/g, "\\${"); // Escape interpolation

    // Wrap in backticks
    setOutput("`" + formatted + "`");
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    if (!output) return;
    
    if (outputRef.current) {
      outputRef.current.select();
      document.execCommand("copy");
      setCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Text Formatter</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-medium mb-2">Input</h2>
          <textarea
            className="w-full h-64 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your text here..."
          />
          
          <div className="flex space-x-3 mt-3">
            <Button 
              onClick={formatAsString}
              disabled={!input}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Format as String
            </Button>
            
            <Button 
              onClick={formatAsTemplateLiteral}
              disabled={!input}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Format as Template Literal
            </Button>
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-medium mb-2">Output</h2>
          <textarea
            ref={outputRef}
            className="w-full h-64 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
            value={output}
            readOnly
            placeholder="Formatted output will appear here..."
          />
          
          <div className="mt-3">
            <Button 
              onClick={copyToClipboard}
              disabled={!output}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {copied ? "Copied!" : "Copy to Clipboard"}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-gray-50 p-4 rounded-md">
        <h3 className="text-lg font-medium mb-2">How to use</h3>
        <ol className="list-decimal list-inside space-y-2">
          <li>Paste your text in the input area</li>
          <li>Choose the format type:
            <ul className="list-disc list-inside ml-6 mt-1">
              <li><strong>String format:</strong> Converts to a JavaScript string with escaped quotes and newlines</li>
              <li><strong>Template literal:</strong> Preserves formatting better, useful for multiline text</li>
            </ul>
          </li>
          <li>Click "Copy to Clipboard" to copy the formatted text</li>
          <li>Paste the formatted text wherever you need it</li>
        </ol>
      </div>
    </div>
  );
}
