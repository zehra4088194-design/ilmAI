from pathlib import Path
import re
import subprocess

GOOD = '28b748c012ad741e76ed907d875dc9104cc9a681'
path = 'src/components/features/admin/settings/PlatformSettingsForm/index.tsx'
original = subprocess.check_output(['git', 'show', f'{GOOD}:{path}'], text=True)
s = original

# Remove only AI-specific admin quota fields; all non-AI limits remain editable.
s = s.replace("  ['aiCreditsDaily', 'Shared AI/day'],\n", '')
s = s.replace("  ['premiumAiMonthly', 'Premium AI/month'],\n", '')
s = s.replace(
    'Change Free, Pro, and Elite prices, daily/weekly usage limits, downloads, and feature toggles here.',
    'Change plan prices and non-AI feature limits here. AI usage comes from one shared credit pool.',
)

# Remove the presentation-specific AI availability/size controls, while keeping the rest of each plan card.
start_marker = '                <div className="space-y-3">\n                  <p className="text-sm font-semibold">Presentation Builder, by audience</p>'
end_marker = '                <div className="space-y-3">\n                  <p className="text-sm font-semibold">Access toggles</p>'
start = s.find(start_marker)
end = s.find(end_marker, start)
if start >= 0 and end > start:
    s = s[:start] + s[end:]
else:
    raise SystemExit('presentation audience settings block not found')

# Remove obsolete icon/import used only by the deleted presentation settings UI.
s = s.replace(' Presentation,', '')
s = s.replace(', Presentation,', ',')

Path(path).write_text(s)
print('admin settings restored and AI-only controls removed')
