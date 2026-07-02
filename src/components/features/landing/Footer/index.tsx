import Link from 'next/link';
import { BookOpen, Heart } from 'lucide-react';

const LINKS = {
  Product: [{ label: 'Features', href: '#features' }, { label: 'Pricing', href: '/pricing' }, { label: 'Blog', href: '/blog' }],
  Support: [{ label: 'Help Center', href: '/help' }, { label: 'Contact', href: '/contact' }, { label: 'Status', href: '/status' }],
  Legal: [{ label: 'Privacy Policy', href: '/privacy' }, { label: 'Terms of Service', href: '/terms' }, { label: 'Cookie Policy', href: '/cookies' }],
};

export function LandingFooter() {
  return (
    <footer className="border-t border-border py-16 bg-muted/10">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold">StudyVerse AI</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pakistan ka sabse advanced AI-powered study platform. Board exams ki perfect tayari.
            </p>
          </div>
          {Object.entries(LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="font-semibold mb-4 text-sm">{heading}</h4>
              <ul className="space-y-2">
                {links.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            © 2025 StudyVerse AI. Pakistan 🇵🇰
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            Made with <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" /> by{' '}
            <span className="font-semibold text-foreground">Hafiz M. Husnain Noor</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
