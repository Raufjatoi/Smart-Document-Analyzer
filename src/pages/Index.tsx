
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Eye, Trash2, RefreshCw, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentViewer from '@/components/DocumentViewer';
import DocumentStats from '@/components/DocumentStats';
import Footer from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';

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

const Index = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedDocs = localStorage.getItem('smart-analyzer-docs');
    if (savedDocs) {
      setDocuments(JSON.parse(savedDocs));
    }
  }, []);

  const saveToStorage = (docs: Document[]) => {
    localStorage.setItem('smart-analyzer-docs', JSON.stringify(docs));
    setDocuments(docs);
  };

  const handleDocumentUploaded = (newDoc: Document) => {
    const updatedDocs = [newDoc, ...documents];
    saveToStorage(updatedDocs);
    toast({
      title: "Document analyzed successfully!",
      description: `${newDoc.name} has been processed and categorized as ${newDoc.type}.`,
    });
  };

  const handleReprocess = async (doc: Document) => {
    setIsUploading(true);
    try {
      // Import the analyzeWithGroq function from DocumentUpload
      const analysis = await analyzeWithGroq(doc.fullText);
      
      const updatedDoc = {
        ...doc,
        type: analysis.classification,
        tags: analysis.tags,
        summary: analysis.summary,
        date: new Date().toISOString().split('T')[0],
        metadata: {
          ...doc.metadata,
          sentiment: analysis.sentiment || 'neutral'
        }
      };
      
      const updatedDocs = documents.map(d => d.id === doc.id ? updatedDoc : d);
      saveToStorage(updatedDocs);
      setSelectedDocument(updatedDoc);
      
      toast({
        title: "Document reprocessed!",
        description: "Analysis has been updated with latest results.",
      });
    } catch (error) {
      toast({
        title: "Reprocessing failed",
        description: "Could not reprocess the document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (docId: string) => {
    const updatedDocs = documents.filter(d => d.id !== docId);
    saveToStorage(updatedDocs);
    if (selectedDocument?.id === docId) {
      setSelectedDocument(null);
    }
    toast({
      title: "Document deleted",
      description: "Document has been removed from your collection.",
    });
  };

  const getTypeEmoji = (type: string) => {
    const emojiMap: { [key: string]: string } = {
      'Resume': '👤',
      'Invoice': '💰',
      'Legal Agreement': '⚖️',
      'Research Paper': '📊',
      'Others': '📄'
    };
    return emojiMap[type] || '📄';
  };

  const getTypeColor = (type: string) => {
    const colorMap: { [key: string]: string } = {
      'Resume': 'bg-blue-100 text-blue-800',
      'Invoice': 'bg-green-100 text-green-800',
      'Legal Agreement': 'bg-red-100 text-red-800',
      'Research Paper': 'bg-purple-100 text-purple-800',
      'Others': 'bg-gray-100 text-gray-800'
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-yellow-400">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            Smart Document Analyzer
          </h1>
          <p className="text-white/80 text-lg">
            Upload, analyze, and organize your documents with AI-powered insights
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <DocumentUpload
              onDocumentUploaded={handleDocumentUploaded}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
            />

            <div className="mt-8">
              <Tabs defaultValue="documents" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-white/10 mb-6">
                  <TabsTrigger value="documents" className="data-[state=active]:bg-white/20">
                    <FileText className="w-4 h-4 mr-2" />
                    Documents ({documents.length})
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="data-[state=active]:bg-white/20">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="documents">
                  {documents.length === 0 ? (
                    <Card className="backdrop-blur-sm bg-white/10 border-white/20">
                      <CardContent className="p-8 text-center">
                        <FileText className="w-16 h-16 text-white/50 mx-auto mb-4" />
                        <p className="text-white/70 text-lg">
                          No documents uploaded yet. Start by uploading your first document!
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {documents.map((doc) => (
                        <motion.div
                          key={doc.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.02 }}
                          className="group"
                        >
                          <Card className="backdrop-blur-sm bg-white/10 border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer">
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">{getTypeEmoji(doc.type)}</span>
                                  <div>
                                    <h3 className="font-semibold text-white truncate max-w-[200px]">
                                      {doc.name}
                                    </h3>
                                    <p className="text-white/60 text-sm">{doc.date}</p>
                                  </div>
                                </div>
                                <Badge className={getTypeColor(doc.type)}>
                                  {doc.type}
                                </Badge>
                              </div>
                              
                              <p className="text-white/80 text-sm mb-4 line-clamp-2">
                                {doc.summary}
                              </p>

                              {/* Document metrics */}
                              <div className="flex justify-between text-white/60 text-xs mb-4">
                                <span>{doc.metadata.wordCount} words</span>
                                <span>{doc.metadata.readingTime}m read</span>
                                {doc.metadata.pageCount && <span>{doc.metadata.pageCount} pages</span>}
                              </div>
                              
                              <div className="flex flex-wrap gap-1 mb-4">
                                {doc.tags.slice(0, 3).map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs bg-white/10 text-white border-white/30">
                                    {tag}
                                  </Badge>
                                ))}
                                {doc.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs bg-white/10 text-white border-white/30">
                                    +{doc.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
                                  onClick={() => setSelectedDocument(doc)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                                  onClick={() => handleReprocess(doc)}
                                  disabled={isUploading}
                                >
                                  <RefreshCw className={`w-4 h-4 ${isUploading ? 'animate-spin' : ''}`} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-red-500/20 border-red-300/30 text-red-100 hover:bg-red-500/30"
                                  onClick={() => handleDelete(doc.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="analytics">
                  <DocumentStats documents={documents} />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="lg:col-span-1">
            {selectedDocument ? (
              <DocumentViewer
                document={selectedDocument}
                onClose={() => setSelectedDocument(null)}
                onReprocess={handleReprocess}
                onDelete={handleDelete}
                isProcessing={isUploading}
              />
            ) : (
              <Card className="backdrop-blur-sm bg-white/10 border-white/20 sticky top-8">
                <CardContent className="p-8 text-center">
                  <Eye className="w-16 h-16 text-white/50 mx-auto mb-4" />
                  <p className="text-white/70">
                    Select a document to view its detailed analysis
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

// Optimize the analyzeWithGroq function to handle large documents better
const analyzeWithGroq = async (text: string) => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  
  // Limit text size to prevent excessive resource usage
  const truncatedText = text.length > 4000 ? text.substring(0, 4000) + "..." : text;
  
  try {
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
            6. "graphs" - array of suggested graph/chart data if applicable`
          },
          {
            role: 'user',
            content: `Analyze this document: ${truncatedText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 800,
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
  } catch (error) {
    console.error('Error analyzing document:', error);
    return {
      classification: 'Others',
      summary: 'Document analysis failed.',
      tags: ['document'],
      sentiment: 'neutral',
      insights: 'Could not analyze the document content.',
      graphs: []
    };
  }
};

export default Index;



