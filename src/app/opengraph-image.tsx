import { ImageResponse } from 'next/og';

export const alt = 'ilm AI — practical learning for school, college, and university';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px',
        color: 'white',
        background:
          'radial-gradient(circle at 85% 20%, #4f46e5 0%, transparent 34%), linear-gradient(135deg, #120d24 0%, #1e123e 50%, #111827 100%)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: 40, fontWeight: 800 }}>
        <div
          style={{
            width: 64,
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            fontSize: 34,
          }}
        >
          i
        </div>
        ilm AI
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: 980 }}>
        <div style={{ fontSize: 70, lineHeight: 1.05, fontWeight: 800 }}>
          Learn clearly. Practise deliberately. Improve with evidence.
        </div>
        <div style={{ color: '#c4b5fd', fontSize: 30 }}>
          AI study tools and practical guides for students in Pakistan
        </div>
      </div>
    </div>,
    size
  );
}
