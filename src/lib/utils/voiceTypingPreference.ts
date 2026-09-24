// Controls how the floating voice-typing/text-to-speech widget (GlobalSpeechControls) behaves
// after the viewer dismisses it (the "X" button) — see Settings > Appearance > Voice typing.
//
// - 'always' (default): dismissing only hides it for the field you were just in. Focus any other
//   field afterwards and it reappears automatically.
// - 'remember-dismiss': once dismissed, it stays hidden for every field for the rest of this tab
//   (until the tab is closed/reloaded) — the original behavior, for anyone who genuinely doesn't
//   want to see it again this session.
// - 'off': never shown at all, anywhere, until turned back on here.
export type VoiceTypingMode = 'always' | 'remember-dismiss' | 'off';

const STORAGE_KEY = 'ilm-ai-voice-typing-mode';
const CHANGE_EVENT = 'ilm-ai-voice-typing-mode-change';

const VALID_MODES: VoiceTypingMode[] = ['always', 'remember-dismiss', 'off'];

export function getVoiceTypingMode(): VoiceTypingMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (VALID_MODES as string[]).includes(stored)) return stored as VoiceTypingMode;
  } catch {
    // Storage unavailable (private mode, blocked) — fall through to the default.
  }
  return 'always';
}

export function setVoiceTypingMode(mode: VoiceTypingMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Best-effort only — the setting just won't persist across reloads.
  }
  window.dispatchEvent(new CustomEvent<VoiceTypingMode>(CHANGE_EVENT, { detail: mode }));
}

/** Subscribes to live changes made elsewhere on the page (e.g. the Settings tab). Returns an unsubscribe function. */
export function onVoiceTypingModeChange(callback: (mode: VoiceTypingMode) => void) {
  const handler = (event: Event) => callback((event as CustomEvent<VoiceTypingMode>).detail);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}
