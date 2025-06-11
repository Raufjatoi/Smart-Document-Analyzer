
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Clock, FileText, TrendingUp, BookOpen } from 'lucide-react';

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

interface DocumentStatsProps {
  documents: Document[];
}

const DocumentStats: React.FC<DocumentStatsProps> = ({ documents }) => {
  if (documents.length === 0) return null;

  // Calculate statistics
  const typeDistribution = documents.reduce((acc, doc) => {
    acc[doc.type] = (acc[doc.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sentimentDistribution = documents.reduce((acc, doc) => {
    acc[doc.metadata.sentiment] = (acc[doc.metadata.sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalWords = documents.reduce((sum, doc) => sum + doc.metadata.wordCount, 0);
  const totalPages = documents.reduce((sum, doc) => sum + (doc.metadata.pageCount || 1), 0);
  const avgReadingTime = Math.round(documents.reduce((sum, doc) => sum + doc.metadata.readingTime, 0) / documents.length);

  const typeChartData = Object.entries(typeDistribution).map(([type, count]) => ({
    type,
    count,
    fill: getTypeColor(type)
  }));

  const sentimentChartData = Object.entries(sentimentDistribution).map(([sentiment, count]) => ({
    sentiment,
    count,
    fill: getSentimentColor(sentiment)
  }));

  const chartConfig = {
    count: { label: "Count" }
  };

  function getTypeColor(type: string) {
    const colors = {
      'Resume': '#3b82f6',
      'Invoice': '#10b981',
      'Legal Agreement': '#ef4444',
      'Research Paper': '#8b5cf6',
      'Others': '#6b7280'
    };
    return colors[type as keyof typeof colors] || '#6b7280';
  }

  function getSentimentColor(sentiment: string) {
    const colors = {
      'positive': '#10b981',
      'neutral': '#6b7280',
      'negative': '#ef4444'
    };
    return colors[sentiment as keyof typeof colors] || '#6b7280';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="backdrop-blur-sm bg-white/10 border-white/20">
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 text-white/70 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{documents.length}</p>
            <p className="text-white/70 text-sm">Documents</p>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-sm bg-white/10 border-white/20">
          <CardContent className="p-4 text-center">
            <BookOpen className="w-8 h-8 text-white/70 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{totalWords.toLocaleString()}</p>
            <p className="text-white/70 text-sm">Total Words</p>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-sm bg-white/10 border-white/20">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-white/70 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{totalPages}</p>
            <p className="text-white/70 text-sm">Total Pages</p>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-sm bg-white/10 border-white/20">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-white/70 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{avgReadingTime}m</p>
            <p className="text-white/70 text-sm">Avg Reading</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document Types Chart */}
        <Card className="backdrop-blur-sm bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Document Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeChartData}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label={({ type, count }) => `${type}: ${count}`}
                  >
                    {typeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Sentiment Analysis Chart */}
        <Card className="backdrop-blur-sm bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Sentiment Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sentimentChartData}>
                  <XAxis dataKey="sentiment" />
                  <YAxis />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {sentimentChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Popular Tags */}
      <Card className="backdrop-blur-sm bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Popular Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {documents
              .flatMap(doc => doc.tags)
              .reduce((acc, tag) => {
                acc[tag] = (acc[tag] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
              && Object.entries(
                documents
                  .flatMap(doc => doc.tags)
                  .reduce((acc, tag) => {
                    acc[tag] = (acc[tag] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
              )
              .sort(([,a], [,b]) => b - a)
              .slice(0, 10)
              .map(([tag, count]) => (
                <Badge key={tag} variant="outline" className="bg-white/10 text-white border-white/30">
                  {tag} ({count})
                </Badge>
              ))
            }
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DocumentStats;
