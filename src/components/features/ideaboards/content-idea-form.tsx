"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";

export interface FormData {
  title: string;
  description: string;
  contentType: string;
  toneStyle: string;
  targetAudience: string;
}

interface ContentIdeaFormProps {
  ideaboardId: string;
  onClose: () => void;
  onNext: (formData: FormData) => void;
}

const CONTENT_TYPES = [
  { value: "blog_post", label: "Blog Post" },
  { value: "social_media_post", label: "Social Media Post" },
  { value: "video_script", label: "Video Script" },
  { value: "youtube_video", label: "YouTube Video" },
  { value: "tiktok_video", label: "TikTok Video" },
  { value: "instagram_post", label: "Instagram Post" },
  { value: "twitter_thread", label: "Twitter Thread" },
  { value: "podcast_episode", label: "Podcast Episode" },
  { value: "newsletter", label: "Newsletter" },
  { value: "course_module", label: "Course Module" },
  { value: "webinar", label: "Webinar" },
  { value: "ebook_chapter", label: "eBook Chapter" },
];

const TONE_STYLES = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "friendly", label: "Friendly" },
  { value: "authoritative", label: "Authoritative" },
  { value: "conversational", label: "Conversational" },
  { value: "humorous", label: "Humorous" },
  { value: "inspirational", label: "Inspirational" },
  { value: "educational", label: "Educational" },
  { value: "persuasive", label: "Persuasive" },
  { value: "storytelling", label: "Storytelling" },
];

interface ContentIdeaFormProps {
  ideaboardId: string;
  onClose: () => void;
  onNext: (formData: FormData) => void;
}

interface FormData {
  title: string;
  description: string;
  contentType: string;
  toneStyle: string;
  targetAudience: string;
}

export function ContentIdeaForm({ ideaboardId, onClose, onNext }: ContentIdeaFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    contentType: "",
    toneStyle: "professional",
    targetAudience: "",
  });

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.contentType) {
      toast.error("Please fill in the required fields");
      return;
    }

    onNext(formData);
  };

  const handleAIGenerate = async () => {
    if (!formData.contentType) {
      toast.error("Please select a content type first");
      return;
    }

    setIsGenerating(true);
    
    try {
      // TODO: Implement AI generation
      // For now, just simulate the generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setFormData(prev => ({
        ...prev,
        title: `AI Generated ${formData.contentType.replace('_', ' ')} Title`,
        description: "This is an AI-generated description for your content idea. You can edit it as needed.",
      }));
      
      toast.success("AI suggestions generated!");
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
      toast.error("Failed to generate AI suggestions");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Content Idea</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleNext} className="space-y-6">
          {/* Content Type */}
          <div className="space-y-2">
            <Label htmlFor="contentType">Content Type *</Label>
            <Select
              value={formData.contentType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, contentType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="title">Title *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAIGenerate}
                disabled={isGenerating || !formData.contentType}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isGenerating ? "Generating..." : "AI Generate"}
              </Button>
            </div>
            <Input
              id="title"
              placeholder="Enter content title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your content idea (optional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Tone Style */}
          <div className="space-y-2">
            <Label>Tone & Style</Label>
            <Select
              value={formData.toneStyle}
              onValueChange={(value) => setFormData(prev => ({ ...prev, toneStyle: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_STYLES.map((tone) => (
                  <SelectItem key={tone.value} value={tone.value}>
                    {tone.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Input
              id="targetAudience"
              placeholder="e.g., Young professionals, Tech enthusiasts"
              value={formData.targetAudience}
              onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Next
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}