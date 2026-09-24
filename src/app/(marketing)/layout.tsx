import { SideChatWidget } from '@/components/features/ai-selector/SideChatWidget';
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SideChatWidget />
    </>
  );
}
