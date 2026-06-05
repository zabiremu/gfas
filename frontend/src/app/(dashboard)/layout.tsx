'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '📊' },
      { href: '/shipments', label: 'Shipments', icon: '📦' },
      { href: '/documents', label: 'Documents', icon: '📄' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/warehouse', label: 'Warehouse', icon: '🏭' },
      { href: '/tracking', label: 'Tracking', icon: '📡' },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, initAuth, logout } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initAuth();
    if (!localStorage.getItem('gfas_token')) {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, [initAuth, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FC] text-gray-400">
        Loading…
      </div>
    );
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const activeItem = NAV_SECTIONS.flatMap((s) => s.items).find((i) =>
    isActive(i.href),
  );
  const pageTitle = activeItem?.label ?? 'Dashboard';

  const fullName = user ? `${user.firstName} ${user.lastName}` : '';
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`
    : '';

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-[260px] flex-col bg-[#07172E] text-white">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="text-xl font-extrabold">
            <span className="mr-1">⚓</span>GFAS
          </div>
          <div className="mt-0.5 text-[11px] text-gray-400">
            Global Freight Automation System
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-6">
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {section.label}
              </div>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 rounded-md border-l-[3px] px-3 py-2 text-sm transition ${
                          active
                            ? 'border-[#1559C9] bg-[#1559C9]/15 font-medium text-white'
                            : 'border-transparent text-gray-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="text-base">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Account
          </div>
          <div className="mb-3 flex items-center gap-3 px-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1559C9] text-sm font-semibold uppercase">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{fullName}</div>
              <div className="text-[11px] text-gray-400">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
          >
            <span className="text-base">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="ml-[260px] flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
          <h1 className="text-lg font-semibold text-[#07172E]">{pageTitle}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">{fullName}</span>
            {user && (
              <span className="rounded-full bg-[#1559C9]/10 px-2.5 py-1 text-xs font-semibold text-[#1559C9]">
                {user.role}
              </span>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
