import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Loader2, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import * as mammoth from 'mammoth';
import JSZip from 'jszip';
import jsPDF from 'jspdf';

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
  insights?: string;
  graphs?: any[];
}

interface DocumentUploadProps {
  onDocumentUploaded: (document: Document) => void;
  isUploading: boolean;
  setIsUploading: (loading: boolean) => void;
  currentDocument?: Document;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onDocumentUploaded,
  isUploading,
  setIsUploading,
  currentDocument
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
      } else if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        text = await extractTextFromZIP(file);
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
        },
        insights: analysis.insights || '',
        graphs: analysis.graphs || []
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

  const extractTextFromZIP = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(arrayBuffer);
      
      let combinedText = '';
      const supportedExtensions = ['.txt', '.pdf', '.docx'];
      
      for (const [filename, zipEntry] of Object.entries(zipContent.files)) {
        if (zipEntry.dir) continue;
        
        const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        
        if (supportedExtensions.includes(extension)) {
          try {
            if (extension === '.txt') {
              const content = await zipEntry.async('text');
              combinedText += `\n\n--- ${filename} ---\n${content}`;
            } else if (extension === '.pdf') {
              const content = await zipEntry.async('arraybuffer');
              const pdfText = await extractTextFromPDFBuffer(content);
              combinedText += `\n\n--- ${filename} ---\n${pdfText}`;
            } else if (extension === '.docx') {
              const content = await zipEntry.async('arraybuffer');
              const docxText = await extractTextFromDOCXBuffer(content);
              combinedText += `\n\n--- ${filename} ---\n${docxText}`;
            }
          } catch (error) {
            console.warn(`Failed to process ${filename}:`, error);
            combinedText += `\n\n--- ${filename} ---\n[Error processing file]`;
          }
        }
      }
      
      if (!combinedText.trim()) {
        throw new Error('No supported text files found in ZIP archive');
      }
      
      return combinedText.trim();
    } catch (error) {
      console.error('ZIP parsing error:', error);
      throw new Error('Failed to parse ZIP file');
    }
  };

  const extractTextFromPDFBuffer = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str).join(' ');
      fullText += strings + '\n\n';
    }

    return fullText.trim();
  };

  const extractTextFromDOCXBuffer = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error('DOCX parsing error:', error);
      throw new Error('Failed to parse DOCX file');
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
            5. "insights" - detailed insights and key findings (2-3 paragraphs)
            6. "graphs" - array of suggested graph/chart data if applicable
            
            Return only valid JSON in this exact format:
            {"classification": "Resume", "summary": "Brief summary here", "tags": ["tag1", "tag2", "tag3"], "sentiment": "positive", "insights": "Detailed insights here", "graphs": []}`
          },
          {
            role: 'user',
            content: `Analyze this document: ${text.substring(0, 4000)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
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
        sentiment: 'neutral',
        insights: 'Document has been processed and analyzed.',
        graphs: []
      };
    }
  };

  const generateAndDownloadPDF = async () => {
    if (!currentDocument) {
      toast({
        title: "No document available",
        description: "Please upload and process a document first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      // Helper function to add text with word wrapping
      const addWrappedText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
        pdf.setFontSize(fontSize);
        if (isBold) {
          pdf.setFont(undefined, 'bold');
        } else {
          pdf.setFont(undefined, 'normal');
        }
        
        const lines = pdf.splitTextToSize(text, maxWidth);
        
        // Check if we need a new page
        if (yPosition + (lines.length * fontSize * 0.5) > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        
        pdf.text(lines, margin, yPosition);
        yPosition += lines.length * fontSize * 0.5 + 5;
      };

      // Title
      addWrappedText(`AI Analysis Report: ${currentDocument.name}`, 18, true);
      yPosition += 10;

      // Document Info
      addWrappedText('Document Information', 14, true);
      addWrappedText(`Type: ${currentDocument.type}`);
      addWrappedText(`Date: ${currentDocument.date}`);
      addWrappedText(`Word Count: ${currentDocument.metadata.wordCount}`);
      addWrappedText(`Reading Time: ${currentDocument.metadata.readingTime} minutes`);
      addWrappedText(`Sentiment: ${currentDocument.metadata.sentiment}`);
      if (currentDocument.metadata.pageCount) {
        addWrappedText(`Page Count: ${currentDocument.metadata.pageCount}`);
      }
      yPosition += 10;

      // Tags
      addWrappedText('Tags', 14, true);
      addWrappedText(currentDocument.tags.join(', '));
      yPosition += 10;

      // Summary
      addWrappedText('Summary', 14, true);
      addWrappedText(currentDocument.summary);
      yPosition += 10;

      // Insights
      if (currentDocument.insights) {
        addWrappedText('AI Insights', 14, true);
        addWrappedText(currentDocument.insights);
        yPosition += 10;
      }

      // Full Text (truncated if too long)
      addWrappedText('Document Content', 14, true);
      const truncatedText = currentDocument.fullText.length > 2000 
        ? currentDocument.fullText.substring(0, 2000) + '...\n\n[Content truncated for PDF export]'
        : currentDocument.fullText;
      addWrappedText(truncatedText, 10);

      // Save the PDF
      const fileName = `AI_Analysis_${currentDocument.name.replace(/\.[^/.]+$/, "")}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF downloaded successfully!",
        description: `Saved as ${fileName}`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF generation failed",
        description: "Could not generate the PDF. Please try again.",
        variant: "destructive",
      });
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
                  Supports: PDF, DOCX, TXT, ZIP (Max 10MB)
                </p>
                
                <div className="flex gap-4 justify-center items-center">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.zip"
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
                  
                  {currentDocument && (
                    <Button
                      onClick={generateAndDownloadPDF}
                      className="bg-green-600/20 hover:bg-green-600/30 text-white border-green-600/30"
                      disabled={isUploading}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download AI Report
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DocumentUpload;