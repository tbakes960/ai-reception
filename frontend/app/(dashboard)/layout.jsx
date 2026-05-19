'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, CalendarDays, MessageSquare, Megaphone, Settings, LogOut, Phone } from 'lucide-react';

const NAV = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/crm', icon: Users, label: 'Guests' },
  { href: '/bookings', icon: CalendarDays, label: 'Bookings' },
  { href: '/conversations', icon: MessageSquare, label: 'Calls' },
  { href: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  function handleLogout() {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col fixed h-full">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-sky-600" />
            <span className="font-bold text-slate-900 text-sm">AI Reception</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? 'bg-sky-50 text-sky-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50 w-full transition-colors">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="ml-56 flex-1 p-6 min-h-screen">
        {children}
      </main>
    </div>
  );
}
