"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface IdeaboardConfig {
  name: string;
  description: string;
  keywords: string[];
  creativity: number;
}

interface IdeaboardCreateFormProps {
  editMode?: boolean;
  initialData?: any;
  onSuccess?: () => void;
}

export function IdeaboardCreateForm({ editMode = false, initialData, onSuccess }: IdeaboardCreateFormProps) {
  const [config, setConfig] = useState<IdeaboardConfig>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    keywords: initialData?.keywords || [],
    creativity: initialData?.creativity || 7,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");

  const addKeyword = () => {
    if (keywordInput.trim() && !config.keywords.includes(keywordInput.trim())) {
      setConfig(prev => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()]
      }));
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setConfig(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted with config:", config);
    
    if (!config.name.trim()) {
      toast.error("Please enter a name for your ideaboard");
      return;
    }

    setIsLoading(true);
    console.log("Starting API request...");
    
    try {
      const url = editMode ? `/api/ideaboards/${initialData?.id}` : "/api/ideaboards";
      const method = editMode ? "PUT" : "POST";
      
      console.log(`Making fetch request to ${url}`);
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      console.log("Response received:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", errorText);
        throw new Error(`Failed to ${editMode ? 'update' : 'create'} ideaboard: ${response.status}`);
      }

      const result = await response.json();
      console.log("Success result:", result);
      toast.success(`Ideaboard ${editMode ? 'updated' : 'created'} successfully!`);
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect back to ideaboards list
        window.location.href = "/ideaboards";
      }
    } catch (error) {
      console.error(`${editMode ? 'Update' : 'Creation'} error:`, error);
      toast.error(`Failed to ${editMode ? 'update' : 'create'} ideaboard. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            {editMode ? 'Edit Ideaboard' : 'Create New Ideaboard'}
          </CardTitle>
          <CardDescription>
            {editMode
              ? 'Update your ideaboard settings and configuration'
              : 'Start with the basics - you\'ll add content and configure settings for each individual idea later'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Title</Label>
            <Input
              id="name"
              value={config.name}
              onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Tech Startup Content Ideas"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={config.description}
              onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this ideaboard is for..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="keywords">Keywords & Topics</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="keywords"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Add relevant keywords"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              />
              <Button type="button" variant="outline" size="icon" onClick={addKeyword}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {config.keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                  {keyword}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeKeyword(keyword)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="creativity">
              AI Creativity Level: {config.creativity}/10
            </Label>
            <input
              id="creativity"
              type="range"
              min="1"
              max="10"
              value={config.creativity}
              onChange={(e) => setConfig(prev => ({ ...prev, creativity: parseInt(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Conservative</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editMode ? 'Update Ideaboard' : 'Create Ideaboard'}
        </Button>
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}