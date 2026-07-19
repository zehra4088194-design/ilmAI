'use client';
import { useState, useRef, type KeyboardEvent, type RefObject } from 'react';
import { Send, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScanUpload } from '@/components/features/ocr/ScanUpload';
import { toast } from 'sonner';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}

export function ChatInput({ onSend, disabled, value, onChange, textareaRef }: ChatInputProps) {
  const [internalText, setInternalText] = useState('');
  const localTextareaRef = useRef<HTMLTextAreaElement>(null);
  const activeTextareaRef = textareaRef ?? localTextareaRef;
  const text = value ?? internalText;
  const setText = onChange ?? setInternalText;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    if (activeTextareaRef.current) activeTextareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Called when OCR successfully extracts text from a scanned photo —
  // we prefix it so the AI knows this came from a scanned question/homework
  const handleScannedText = (extractedText: string) => {
    if (!extractedText) {
      toast.error('No text was found in this image.');
      return;
    }
    setText(text ? `${text}\n\n${extractedText}` : `Explain this question:\n\n${extractedText}`);
    activeTextareaRef.current?.focus();
  };

  return (
    <div className="border-border px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:pt-3">
      <div className="flex items-end gap-2 glass rounded-2xl border border-border/50 p-2">
        <ScanUpload
          onTextExtracted={handleScannedText}
          trigger={
            <Button variant="ghost" size="icon" className="shrink-0" title="Scan a question from a photo">
              <Camera className="w-4 h-4" />
            </Button>
          }
        />
        <textarea
          ref={activeTextareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder="Write your question here or scan it with the camera..."
          rows={1}
          disabled={disabled}
          className="max-h-32 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <Button variant="gradient" size="icon" className="shrink-0" onClick={handleSend} disabled={disabled || !text.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-muted-foreground mt-1.5 hidden text-center text-[11px] sm:block">ilm AI can make mistakes. Verify important information.</p>
    </div>
  );
}
