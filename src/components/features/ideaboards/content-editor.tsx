"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Sparkles,
  FileText,
  Image,
  Video,
  Save,
  Wand2,
  TrendingUp,
  Bold,
  Italic,
  Underline,
  List,
  Quote,
  Link,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight
} from "lucide-react";
import { toast } from "sonner";
import { FormData } from "./content-idea-form";

interface ContentEditorProps {
  ideaboardId: string;
  formData: FormData;
  onClose: () => void;
  onBack: () => void;
  onSuccess: () => void;
  editingContent?: any; // For editing existing content
}

interface ScrapedContent {
  id: string;
  title: string;
  platform: string;
  url: string;
  description: string;
  type: 'video' | 'post' | 'article';
}

// Mock scraped content - in real app, this would come from API
const mockScrapedContent: ScrapedContent[] = [
  {
    id: "1",
    title: "10 Tips for Social Media Success",
    platform: "YouTube",
    url: "https://youtube.com/watch?v=example1",
    description: "A comprehensive guide covering the essentials of social media marketing...",
    type: "video"
  },
  {
    id: "2", 
    title: "The Future of Content Marketing",
    platform: "Twitter",
    url: "https://twitter.com/example/status/123",
    description: "Thread discussing emerging trends in content marketing for 2024...",
    type: "post"
  },
  {
    id: "3",
    title: "How to Create Engaging Content",
    platform: "Reddit",
    url: "https://reddit.com/r/marketing/post/123",
    description: "Community discussion about strategies for creating content that resonates...",
    type: "post"
  }
];

export function ContentEditor({
  ideaboardId,
  formData,
  onClose,
  onBack,
  onSuccess,
  editingContent
}: ContentEditorProps) {
  const [content, setContent] = useState(editingContent?.content || "");
  const [selectedContent, setSelectedContent] = useState<string[]>(editingContent?.referencedContent || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");
  const [editorRef, setEditorRef] = useState<HTMLTextAreaElement | null>(null);

  // Rich text formatting functions
  const insertAtCursor = (before: string, after: string = "") => {
    if (!editorRef) return;
    
    const start = editorRef.selectionStart;
    const end = editorRef.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    setContent(newText);
    
    // Restore cursor position
    setTimeout(() => {
      if (editorRef) {
        editorRef.focus();
        editorRef.setSelectionRange(start + before.length, end + before.length);
      }
    }, 0);
  };

  const formatBold = () => insertAtCursor("**", "**");
  const formatItalic = () => insertAtCursor("*", "*");
  const formatUnderline = () => insertAtCursor("<u>", "</u>");
  const formatQuote = () => insertAtCursor("> ");
  const formatH1 = () => insertAtCursor("# ");
  const formatH2 = () => insertAtCursor("## ");
  const formatH3 = () => insertAtCursor("### ");
  const formatList = () => insertAtCursor("- ");
  const formatLink = () => insertAtCursor("[", "](url)");

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate AI generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const generatedContent = `# ${formData.title}

## Overview
This is an AI-generated ${formData.contentType.replace('_', ' ')} with a ${formData.toneStyle} tone${formData.targetAudience ? ` targeting ${formData.targetAudience}` : ''}.

## Content Structure

### Introduction
${formData.description || 'Start with an engaging hook that captures your audience\'s attention and clearly establishes the value they\'ll receive from this content.'}

### Main Points
- **Point 1**: Key insight or valuable information
- **Point 2**: Supporting evidence or examples
- **Point 3**: Actionable takeaways

### Call to Action
End with a clear call to action that guides your audience toward the next step.

${selectedContent.length > 0 ? `\n## Referenced Content\nThis content incorporates insights from ${selectedContent.length} selected sources to provide comprehensive and well-researched information.` : ''}

---
*Generated with AI assistance*`;

      setContent(generatedContent);
      toast.success("Content generated successfully!");
    } catch (error) {
      console.error("Error generating content:", error);
      toast.error("Failed to generate content");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("Please add some content before saving");
      return;
    }

    setIsSaving(true);
    
    try {
      const url = editingContent
        ? `/api/ideaboards/${ideaboardId}/content/${editingContent.id}`
        : `/api/ideaboards/${ideaboardId}/content`;
      
      const method = editingContent ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          content,
          referencedContent: selectedContent,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save content");
      }

      toast.success(editingContent ? "Content updated successfully!" : "Content idea saved successfully!");
      onSuccess();
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error("Failed to save content");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleContentSelection = (contentId: string) => {
    setSelectedContent(prev => 
      prev.includes(contentId) 
        ? prev.filter(id => id !== contentId)
        : [...prev, contentId]
    );
  };

  return (
    <div className="editor-container bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{formData.title}</h1>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">{formData.contentType.replace('_', ' ')}</Badge>
              <Badge variant="outline" className="text-xs">{formData.toneStyle}</Badge>
              {formData.targetAudience && (
                <Badge variant="outline" className="text-xs">{formData.targetAudience}</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleAIGenerate}
              disabled={isGenerating}
              variant="outline"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isGenerating ? "Generating..." : "AI Generate"}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              ×
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2 mx-4 my-2">
            <TabsTrigger value="editor">
              <FileText className="h-4 w-4 mr-2" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="references">
              <TrendingUp className="h-4 w-4 mr-2" />
              References ({selectedContent.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden space-y-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full space-y-0">
          <TabsContent value="editor" className="h-full m-0 p-0">
            <div className="h-full flex space-y-0" style={{ flexDirection: 'column' }}>
              {/* Rich Text Toolbar */}
              <div className="border-b p-2 bg-muted/50 space-y-0">
                <div className="flex items-center gap-1 flex-wrap space-y-0">
                  {/* Text Formatting */}
                  <div className="flex items-center gap-1 mr-4">
                    <Button variant="ghost" size="icon" onClick={formatBold} title="Bold">
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={formatItalic} title="Italic">
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={formatUnderline} title="Underline">
                      <Underline className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Headers */}
                  <div className="flex items-center gap-1 mr-4">
                    <Button variant="ghost" size="sm" onClick={formatH1} title="Heading 1">
                      H1
                    </Button>
                    <Button variant="ghost" size="sm" onClick={formatH2} title="Heading 2">
                      H2
                    </Button>
                    <Button variant="ghost" size="sm" onClick={formatH3} title="Heading 3">
                      H3
                    </Button>
                  </div>

                  {/* Lists */}
                  <div className="flex items-center gap-1 mr-4">
                    <Button variant="ghost" size="icon" onClick={formatList} title="Bullet List">
                      <List className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={formatQuote} title="Quote">
                      <Quote className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Other */}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={formatLink} title="Link">
                      <Link className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 flex" style={{ height: 'calc(100vh - 180px)' }}>
                <div className="flex-1 p-0">
                  <textarea
                    ref={setEditorRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Start writing your content here... Use the toolbar above for formatting.

# Heading 1
## Heading 2
**Bold text** *Italic text*
- Bullet point

Or click 'AI Generate' to have AI create content based on your settings."
                    className="w-full h-full p-6 border-none outline-none resize-none bg-transparent text-sm leading-relaxed"
                  />
                </div>
                
                {/* Live Preview Panel */}
                <div className="w-1/2 border-l bg-muted/20 p-6 overflow-y-auto">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Live Preview</h3>
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{
                      __html: content
                        .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mb-2">$1</h1>')
                        .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mb-2">$1</h2>')
                        .replace(/^### (.*$)/gm, '<h3 class="text-base font-medium mb-1">$1</h3>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
                        .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-border pl-4 italic text-muted-foreground">$1</blockquote>')
                        .replace(/^- (.*$)/gm, '<li class="ml-4">• $1</li>')
                        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary underline">$1</a>')
                        .replace(/\n/g, '<br>')
                    }}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="references" className="h-full m-0 overflow-y-auto p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Scraped Content References</h3>
                <p className="text-sm text-muted-foreground">
                  Select content to include as references in your AI generation
                </p>
              </div>
              
              <div className="grid gap-4">
                {mockScrapedContent.map((item) => (
                  <Card
                    key={item.id}
                    className={`cursor-pointer transition-all ${
                      selectedContent.includes(item.id)
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleContentSelection(item.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base line-clamp-1">
                            {item.title}
                          </CardTitle>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {item.platform}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {item.type}
                            </Badge>
                          </div>
                        </div>
                        {selectedContent.includes(item.id) && (
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white"></div>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}