 'use client';
import { createFileRoute } from '@tanstack/react-router';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import ResetPassword from '..';

export const Route = createFileRoute('/reset-password/reset-password/')({
  component: ResetPassword,
  head: () => {
    const pageUrl = getCanonicalUrl('/reset-password');
    const meta = seo({
      title: 'Reset Password | Moneko',
      description: 'Reset your Moneko account password',
      keywords: 'reset password, account recovery, Moneko',
      url: pageUrl,
    });
    
    return {
      meta,
      link: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ]
    };
  },
});