// ============================================
// AI PROVIDER + MODEL TIER CONFIG
// Shared by every AI dropdown in the app.
// ============================================
import type { AiProviderId, ModelTier } from '@/lib/ai/gateway';

export interface AIProviderOption {
  id: AiProviderId;
  label: string;
  freeAvailable: boolean; // only Assistant is true - everything else needs Pro/Elite
}

export const AI_PROVIDERS: AIProviderOption[] = [
  { id: 'groq', label: 'Assistant', freeAvailable: true },
  { id: 'claude', label: 'Claude', freeAvailable: false },
  { id: 'gpt', label: 'ChatGPT', freeAvailable: false },
  { id: 'gemini', label: 'Gemini', freeAvailable: false },
];

export interface ModelTierOption {
  id: ModelTier;
  label: string;
  dailyLimit: number;
  description: string;
}

export const MODEL_TIERS: ModelTierOption[] = [
  { id: 'mini', label: 'Mini (Fast)', dailyLimit: 20, description: 'Pro 20/day, Elite 50/day' },
  { id: 'medium', label: 'Medium (Balanced)', dailyLimit: 20, description: 'Pro 20/day, Elite 50/day' },
  { id: 'pro', label: 'Pro (Most Capable)', dailyLimit: 50, description: 'Elite 50/day' },
];
