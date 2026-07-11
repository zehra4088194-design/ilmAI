import Link from "next/link";
import { redirect } from "next/navigation";
import { Video, FileText, Inbox, Users, Settings, LayoutDashboard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCollegeAdminContext } from "@/lib/college/access";

const NAV_ITEMS = [
  { href: "/college-admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/college-admin/lectures", label: "Lectures", icon: Video },
  { href: "/college-admin/resources", label: "Resources", icon: FileText },
  { href: "/college-admin/requests", label: "Requests", icon: Inbox },
  { href: "/college-admin/students", label: "Students", icon: Users },
  { href: "/college-admin/settings", label: "Settings", icon: Settings },
];

export default async function CollegeAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const context = await getCollegeAdminContext(supabase, user.id);
  if (!context) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto p-4">
          <span className="me-4 shrink-0 font-semibold">{context.college.name}</span>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-5xl p-4 md:p-8">{children}</main>
    </div>
  );
}
