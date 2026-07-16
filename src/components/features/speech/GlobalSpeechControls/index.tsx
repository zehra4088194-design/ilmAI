'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Volume2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';

type EditableElement = HTMLTextAreaElement | HTMLInputElement | HTMLElement;

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const TEXT_INPUT_TYPES = new Set(['', 'text', 'search', 'email', 'url', 'tel']);

function isEditableTarget(target: EventTarget | null): target is EditableElement {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement) return !target.disabled && !target.readOnly;
  if (target instanceof HTMLInputElement) {
    return TEXT_INPUT_TYPES.has(target.type) && !target.disabled && !target.readOnly;
  }
  return false;
}

function getElementText(element: EditableElement) {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const selected = element.value.slice(element.selectionStart ?? 0, element.selectionEnd ?? 0).trim();
    return selected || element.value.trim();
  }
  const selection = window.getSelection()?.toString().trim();
  return selection || element.textContent?.trim() || '';
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  setter?.call(element, value);
  element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
}

function insertText(element: EditableElement, text: string) {
  if (!text.trim()) return;
  const chunk = text.endsWith(' ') ? text : `${text} `;

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? element.value.length;
    const nextValue = `${element.value.slice(0, start)}${chunk}${element.value.slice(end)}`;
    setNativeValue(element, nextValue);
    const nextCursor = start + chunk.length;
    element.setSelectionRange(nextCursor, nextCursor);
    element.focus();
    return;
  }

  element.focus();
  document.execCommand('insertText', false, chunk);
  element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: chunk }));
}

export function GlobalSpeechControls() {
  const [activeElement, setActiveElement] = useState<EditableElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [listening, setListening] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setDismissed(window.sessionStorage.getItem('ilm-ai-speech-controls-dismissed') === '1');
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      const element = activeElement;
      if (!element || !document.body.contains(element)) {
        setPosition(null);
        return;
      }
      const rect = element.getBoundingClientRect();
      setPosition({
        top: Math.max(8, rect.top - 44),
        left: Math.min(window.innerWidth - 132, Math.max(8, rect.right - 132)),
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [activeElement]);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      if (isEditableTarget(event.target)) {
        setActiveElement(event.target);
      }
    };
    const onFocusOut = () => {
      window.setTimeout(() => {
        if (!isEditableTarget(document.activeElement)) {
          setActiveElement(null);
        }
      }, 80);
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speak = () => {
    if (!activeElement) return;
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-voice is browser mein supported nahi hai');
      return;
    }
    const text = getElementText(activeElement);
    if (!text) {
      toast.error('Read karne ke liye text likho ya select karo');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = /[\u0600-\u06FF]/.test(text) ? 'ur-PK' : 'en-US';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  const toggleListen = () => {
    if (!activeElement) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice-to-text is browser mein supported nahi hai. Chrome/Edge try karo.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-PK';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let finalText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal) finalText += result[0]?.transcript || '';
      }
      insertText(activeElement, finalText);
    };
    recognition.onerror = (event) => {
      setListening(false);
      toast.error(event.error === 'not-allowed' ? 'Microphone permission allow karo' : 'Voice input start nahi ho saka');
    };
    recognition.onend = () => setListening(false);

    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
      toast.error('Voice input start nahi ho saka');
    }
  };

  if (dismissed || !activeElement || !position) return null;

  return (
    <div
      className="fixed z-[80] flex items-center gap-1 rounded-full border border-border bg-background/95 p-1 shadow-lg backdrop-blur"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <button
        type="button"
        onClick={toggleListen}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          listening && 'bg-red-500 text-white hover:bg-red-500 hover:text-white'
        )}
        title={listening ? 'Stop voice typing' : 'Voice to text'}
        aria-label={listening ? 'Stop voice typing' : 'Voice to text'}
      >
        {listening ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={speak}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Text to voice"
        aria-label="Text to voice"
      >
        <Volume2 className="h-3.5 w-3.5" />
      </button>
      <span className="mx-0.5 h-5 w-px bg-border" />
      <button
        type="button"
        onClick={() => {
          recognitionRef.current?.abort();
          window.speechSynthesis?.cancel();
          window.sessionStorage.setItem('ilm-ai-speech-controls-dismissed', '1');
          setDismissed(true);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        title="Is tab ke liye hide karo"
        aria-label="Hide voice controls for this tab"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
