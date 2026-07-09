// ============================================
// AI PROVIDER + MODEL TIER CONFIG (shared by every AI dropdown in the app)
// ============================================
import type { AiProviderId, ModelTier } from '@/lib/ai/gateway';

export interface AIProviderOption {
  id: AiProviderId;
  label: string;
  emoji: string;
  freeAvailable: boolean; // only Assistant is true - everything else needs Pro/Elite
}

export const AI_PROVIDERS: AIProviderOption[] = [
  { id: 'groq', label: 'Assistant', emoji: '⚡', freeAvailable: true },
  { id: 'claude', label: 'Claude', emoji: '🟣', freeAvailable: false },
  { id: 'gpt', label: 'ChatGPT', emoji: '🟢', freeAvailable: false },
  { id: 'gemini', label: 'Gemini', emoji: '🔵', freeAvailable: false },
];

export interface ModelTierOption {
  id: ModelTier;
  label: string;
  dailyLimit: number;
  description: string;
}

export const MODEL_TIERS: ModelTierOption[] = [
  { id: 'mini', label: 'Mini (Fast)', dailyLimit: 10, description: '10 calls/day' },
  { id: 'medium', label: 'Medium (Balanced)', dailyLimit: 7, description: '7 calls/day' },
  { id: 'pro', label: 'Pro (Most Capable)', dailyLimit: 3, description: '3 calls/day' },
];
