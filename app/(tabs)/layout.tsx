'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PropsWithChildren } from 'react';

const tabs = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/history', label: 'History', icon: '🕒' },
  { href: '/rules', label: 'Rules', icon: '📘' },
];

export default function TabsLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();

  return (
    <div className="tabs-layout">
      <main className="tabs-content">{children}</main>
      <nav className="tabs-nav" aria-label="Bottom navigation">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/'
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} className={isActive ? 'tab active' : 'tab'}>
              <span aria-hidden>{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

