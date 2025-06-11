
import React from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw, Trash2, FileText, Calendar, Tag, Clock, BookOpen, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

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

interface DocumentViewerProps {
  document: Document;
  onClose: () => void;
  onReprocess: (document: Document) => void;
  onDelete: (documentId: string) => void;
  isProcessing: boolean;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  onClose,
  onReprocess,
  onDelete,
  isProcessing
}) => {
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

  const getSentimentColor = (sentiment: string) => {
    const colorMap: { [key: string]: string } = {
      'positive': 'bg-green-100 text-green-800',
      'neutral': 'bg-gray-100 text-gray-800',
      'negative': 'bg-red-100 text-red-800'
    };
    return colorMap[sentiment] || 'bg-gray-100 text-gray-800';
  };

  const formatText = (text: string) => {
    // Simple formatting: preserve paragraphs and add basic styling
    return text
      .split('\n\n')
      .map((paragraph, index) => (
        <p key={index} className="mb-3 text-white/70 text-sm leading-relaxed">
          {paragraph.trim()}
        </p>
      ));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="sticky top-8"
    >
      <Card className="backdrop-blur-sm bg-white/10 border-white/20 max-h-[calc(100vh-4rem)]">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getTypeEmoji(document.type)}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-white text-lg truncate">
                  {document.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-white/60" />
                  <span className="text-white/60 text-sm">{document.date}</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge className={getTypeColor(document.type)}>
              {document.type}
            </Badge>
            <Badge className={getSentimentColor(document.metadata.sentiment)}>
              {document.metadata.sentiment}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <div className="space-y-6">
              {/* Document Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-white/70" />
                    <span className="text-white/70 text-sm">Words</span>
                  </div>
                  <p className="text-white font-semibold">{document.metadata.wordCount.toLocaleString()}</p>
                </div>
                
                <div className="bg-white/5 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-white/70" />
                    <span className="text-white/70 text-sm">Reading Time</span>
                  </div>
                  <p className="text-white font-semibold">{document.metadata.readingTime} min</p>
                </div>
                
                {document.metadata.pageCount && (
                  <div className="bg-white/5 p-3 rounded-lg col-span-2">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-white/70" />
                      <span className="text-white/70 text-sm">Pages</span>
                    </div>
                    <p className="text-white font-semibold">{document.metadata.pageCount}</p>
                  </div>
                )}
              </div>

              <Separator className="bg-white/20" />

              {/* Summary Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-white/70" />
                  <h4 className="font-medium text-white">AI Summary</h4>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border-l-4 border-blue-400">
                  <p className="text-white/80 text-sm leading-relaxed italic">
                    "{document.summary}"
                  </p>
                </div>
              </div>

              <Separator className="bg-white/20" />

              {/* Tags Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-white/70" />
                  <h4 className="font-medium text-white">Tags & Keywords</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {document.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-white/10 text-white border-white/30 text-xs hover:bg-white/20 transition-colors"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator className="bg-white/20" />

              {/* Full Text Section */}
              <div>
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Full Content
                </h4>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <ScrollArea className="h-64">
                    <div className="prose prose-sm max-w-none">
                      {formatText(document.fullText)}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              <Separator className="bg-white/20" />

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReprocess(document)}
                  disabled={isProcessing}
                  className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                  Reprocess
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(document.id)}
                  className="bg-red-500/20 border-red-300/30 text-red-100 hover:bg-red-500/30"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DocumentViewer;
