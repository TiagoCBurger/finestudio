'use client';

import { Logo } from '@/components/logo';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export const SubFooter = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col items-start justify-between gap-4 px-8 text-muted-foreground text-sm md:flex-row">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
        <Link href="/">
          <Logo className="h-4 w-auto" />
        </Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/acceptable-use">Acceptable Use</Link>
        <a
          href="https://github.com/haydenbleasel/fine-studio"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source Code
        </a>
        <a
          href="https://x.com/haydenbleasel"
          target="_blank"
          rel="noopener noreferrer"
        >
          Contact
        </a>
      </div>
      <div className="flex items-center justify-end">
        {mounted && <ThemeSwitcher />}
      </div>
    </div>
  );
};
