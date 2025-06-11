import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import * as mammoth from 'mammoth';

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import Worker from 'pdfjs-dist/build/pdf.worker?worker';

GlobalWorkerOptions.workerPort = new Worker();

// Properly set worker source
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();


interface Document {
  id: string;
  name: string;
  type: string;
  tags: string[];
  summary: string;
  fullText: string;
  date: string;
  metadata: {
    wordCount: number;
    pageCount?: number;
    readingTime: number;
    sentiment: string;
  };
}

interface DocumentUploadProps {
  onDocumentUploaded: (document: Document) => void;
  isUploading: boolean;
  setIsUploading: (loading: boolean) => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onDocumentUploaded,
  isUploading,
  setIsUploading
}) => {
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  const processFile = async (file: File) => {
    setIsUploading(true);
    
    try {
      let text = '';
      let pageCount = undefined;
      
      if (file.type === 'application/pdf') {
        const result = await extractTextFromPDF(file);
        text = result.text;
        pageCount = result.pageCount;
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        text = await extractTextFromDOCX(file);
      } else if (file.type === 'text/plain') {
        text = await file.text();
      } else {
        throw new Error('Unsupported file type');
      }

      if (!text || text.trim().length === 0) {
        throw new Error('No text content found in the document');
      }

      // Calculate metadata
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      const readingTime = Math.ceil(wordCount / 200); // Average reading speed

      // Analyze with Groq
      const analysis = await analyzeWithGroq(text);
      
      const document: Document = {
        id: crypto.randomUUID(),
        name: file.name,
        type: analysis.classification,
        tags: analysis.tags,
        summary: analysis.summary,
        fullText: text,
        date: new Date().toISOString().split('T')[0],
        metadata: {
          wordCount,
          pageCount,
          readingTime,
          sentiment: analysis.sentiment || 'neutral'
        }
      };

      onDocumentUploaded(document);
      toast({
        title: "Document processed successfully!",
        description: `Extracted ${wordCount} words and analyzed with AI.`,
      });
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not process the document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

const extractTextFromPDF = async (file: File): Promise<{ text: string, pageCount: number }> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str).join(' ');
    fullText += strings + '\n\n';
  }

  return { text: fullText.trim(), pageCount: pdf.numPages };
};

  const extractTextFromDOCX = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error('DOCX parsing error:', error);
      throw new Error('Failed to parse DOCX file');
    }
  };

  const analyzeWithGroq = async (text: string) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'compound-beta',
        messages: [
          {
            role: 'system',
            content: `You are a document analysis AI. Analyze the provided document text and return a JSON response with:
            1. "classification" - categorize as: Resume, Invoice, Legal Agreement, Research Paper, or Others
            2. "summary" - a concise 2-3 sentence summary
            3. "tags" - array of 3-6 relevant keywords/tags
            4. "sentiment" - overall sentiment: positive, neutral, or negative
            
            Return only valid JSON in this exact format:
            {"classification": "Resume", "summary": "Brief summary here", "tags": ["tag1", "tag2", "tag3"], "sentiment": "positive"}`
          },
          {
            role: 'user',
            content: `Analyze this document: ${text.substring(0, 4000)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error('Groq API request failed');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      return JSON.parse(content);
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        classification: 'Others',
        summary: 'Document analyzed successfully.',
        tags: ['document', 'analyzed'],
        sentiment: 'neutral'
      };
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file) {
      processFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card className={`backdrop-blur-sm transition-all duration-300 ${
        dragOver 
          ? 'bg-white/20 border-white/40 scale-[1.02]' 
          : 'bg-white/10 border-white/20'
      }`}>
        <CardContent className="p-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
              dragOver 
                ? 'border-white/60 bg-white/10' 
                : 'border-white/30'
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
                <p className="text-white text-lg font-medium mb-2">
                  Processing Document...
                </p>
                <p className="text-white/70">
                  Extracting text and analyzing with AI
                </p>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-white/70 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Upload Your Document
                </h3>
                <p className="text-white/70 mb-6">
                  Drag & drop your file here, or click to browse
                </p>
                <p className="text-white/60 text-sm mb-6">
                  Supports: PDF, DOCX, TXT (Max 10MB)
                </p>
                
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  disabled={isUploading}
                />
                <label htmlFor="file-upload">
                  <Button
                    asChild
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30 cursor-pointer"
                    disabled={isUploading}
                  >
                    <span>
                      <FileText className="w-4 h-4 mr-2" />
                      Choose File
                    </span>
                  </Button>
                </label>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DocumentUpload;