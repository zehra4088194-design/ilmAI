from pathlib import Path
import re


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'missing anchor: {label}')
    p.write_text(text.replace(old, new, 1))


# AI limits: the only user AI entitlement is the shared credit wallet.
replace_once(
    'src/lib/rate-limit/index.ts',
    """export function getAiDailyLimit(tier: SubscriptionTier, _feature: 'side_chat' | 'tool' = 'tool') {
  if (tier === 'ELITE') return AI_DAILY_LIMITS.ELITE_TOOL;
  if (tier === 'PRO') return AI_DAILY_LIMITS.PRO_TOOL;
  return AI_DAILY_LIMITS.FREE_TOOL;
}""",
    """export function getAiDailyLimit(_tier: SubscriptionTier, _feature: 'side_chat' | 'tool' = 'tool') {
  // Compatibility API. AI usage is governed only by the shared credit wallet.
  return -1;
}""",
    'getAiDailyLimit',
)

p = Path('src/lib/rate-limit/index.ts')
s = p.read_text()
old = """  if (tier === 'FREE') {
    return `You have used all free weekly credits for ${featureLabel}. Pro includes ${pro.limits.aiCreditsMonthly} per month, up to ${pro.limits.aiCreditsDaily} per day.`;
  }"""
new = """  if (tier === 'FREE') {
    return `You have used all free weekly credits for ${featureLabel}. Pro includes ${pro.limits.aiCreditsMonthly} shared credits per month.`;
  }"""
if old in s:
    s = s.replace(old, new, 1)

# Preserve function signatures so existing callers keep compiling; remove the extra model quota.
model_start = s.find('export async function checkModelTierLimit(')
model_end = s.find('export async function checkParentAttachmentLimits', model_start)
if model_start < 0 or model_end < 0:
    raise SystemExit('checkModelTierLimit boundaries missing')
s = s[:model_start] + """export async function checkModelTierLimit(
  _userId: string,
  _provider: string,
  _modelTier: 'mini' | 'medium' | 'pro',
  _userTier: SubscriptionTier = 'PRO'
) {
  return { success: true, remaining: -1, reset: 0 };
}

""" + s[model_end:]

# Presentation and file-summary/test usage are also already charged from the shared wallet.
pres_start = s.find('export async function checkPresentationLimit(')
pres_end = s.find('export async function checkFileSummaryLimit', pres_start)
if pres_start < 0 or pres_end < 0:
    raise SystemExit('checkPresentationLimit boundaries missing')
s = s[:pres_start] + """export async function checkPresentationLimit(userId: string, tier: SubscriptionTier, _slideCount: number) {
  const audience = (await getAudiencePlanLimits(userId, tier)).audience;
  return { success: true, remaining: -1, reset: 0, maxSlides: Number.MAX_SAFE_INTEGER, audience };
}

""" + s[pres_end:]

file_start = s.find('export async function checkFileSummaryLimit(')
uni_start = s.find('export async function checkUniversityFeatureLimit', file_start)
if file_start >= 0 and uni_start >= 0:
    block = """export async function checkFileSummaryLimit(userId: string, tier: SubscriptionTier) {
  return { success: true, remaining: -1, reset: 0 };
}

export async function checkFileTestLimit(userId: string, tier: SubscriptionTier) {
  return { success: true, remaining: -1, reset: 0 };
}

"""
    summary_end = s.find('export async function checkUniversityFeatureLimit', file_start)
    # Only replace the two old file functions if the known pair exists.
    old_file_end = s.find('export async function checkUniversityFeatureLimit', file_start)
    existing = s[file_start:old_file_end]
    if 'checkFileTestLimit' in existing:
        s = s[:file_start] + block + s[old_file_end:]

p.write_text(s)

# Admin UI: no separate AI day cap, premium-model cap, or presentation audience quota controls.
p = Path('src/components/features/admin/settings/PlatformSettingsForm/index.tsx')
s = p.read_text()
s = s.replace("  ['aiCreditsDaily', 'Shared AI/day'],\n", "")
s = s.replace("  ['premiumAiMonthly', 'Premium AI/month'],\n", "")
s = s.replace(
    'Change Free, Pro, and Elite prices, daily/weekly usage limits, downloads, and feature toggles here.',
    'Change plan prices and non-AI feature limits here. AI usage comes from one shared credit pool.',
)

# Remove any compact NumberField whose props contain an AI-credit label.
pattern = re.compile(r'\n\s*<NumberField\b[^/]*label=[\"\'][^\"\']*AI credits[^\"\'][\"\'][^/]*/>\n', re.I)
s = pattern.sub('\n', s)

# Remove the complete presentation audience settings card, identified by its heading.
heading = 'Presentation Builder, by audience'
pos = s.find(heading)
if pos >= 0:
    start = s.rfind('<Card', 0, pos)
    end = s.find('</Card>', pos)
    if start >= 0 and end >= 0:
        s = s[:start] + s[end + len('</Card>'):]
p.write_text(s)

# Old stored platform-settings values remain harmless; the rate-limit code no longer consumes them.
p = Path('src/lib/platform-settings/shared.ts')
s = p.read_text()
s = re.sub(r'(?m)^(\s*)aiCreditsDaily: numberOrFallback\([^\n]*\),$', r'\1aiCreditsDaily: -1,', s)
s = re.sub(r'(?m)^(\s*)premiumAiMonthly: numberOrFallback\([^\n]*\),$', r'\1premiumAiMonthly: -1,', s)
p.write_text(s)

print('credit-only AI policy applied')
