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
  { id: 'gemini', label: 'Gemini Flash-Lite', freeAvailable: true },
];

export interface ModelTierOption {
  id: ModelTier;
  label: string;
  dailyLimit: number;
  description: string;
}

export const MODEL_TIERS: ModelTierOption[] = [
  { id: 'mini', label: 'Flash-Lite', dailyLimit: 0, description: 'Uses the shared credit pool' },
  { id: 'medium', label: 'Flash-Lite', dailyLimit: 0, description: 'Uses the shared credit pool' },
];
