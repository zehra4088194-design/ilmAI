'use client';
import { useState, useRef, type KeyboardEvent } from 'react';
import { Send, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScanUpload } from '@/components/features/ocr/ScanUpload';
import { toast } from 'sonner';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
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
      toast.error('Koi text nahi mila is image mein');
      return;
    }
    setText((prev) => (prev ? `${prev}\n\n${extractedText}` : `Is sawal ko explain karo:\n\n${extractedText}`));
    textareaRef.current?.focus();
  };

  return (
    <div className="p-4 border-t border-border">
      <div className="flex items-end gap-2 glass rounded-2xl border border-border/50 p-2">
        <ScanUpload
          onTextExtracted={handleScannedText}
          trigger={
            <Button variant="ghost" size="icon" className="shrink-0" title="Photo se sawal scan karo">
              <Camera className="w-4 h-4" />
            </Button>
          }
        />
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder="Apna sawal yahan likho ya camera se scan karo..."
          rows={1}
          disabled={disabled}
          className="flex-1 bg-transparent resize-none outline-none text-sm py-2 max-h-32 placeholder:text-muted-foreground disabled:opacity-50"
        />
        <Button variant="gradient" size="icon" className="shrink-0" onClick={handleSend} disabled={disabled || !text.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">StudyVerse AI mistakes kar sakta hai. Important info verify kar lena.</p>
    </div>
  );
}
