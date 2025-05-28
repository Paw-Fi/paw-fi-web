// app/routes/__root.tsx
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
// import React from 'react';
// import { Outlet } from 'react-router-dom';
// import { createFileRoute } from '@tanstack/react-router';
// import { AuthProvider } from '../contexts/auth-context';
// import { ChatProvider } from '../contexts/chat-context';
// import { ToastContainer } from 'react-toastify';
// import { NotFound } from '../components/not-found';
// import 'react-toastify/dist/ReactToastify.css';
// import PageLayout from '@/components/layout/page-layout';

// export const Route = createFileRoute('/')({
//   component: Root,
//   notFoundComponent: NotFound,
// });

// function Root() {
//   return (
//     <AuthProvider>
//       <ChatProvider>
//         <PageLayout/>
//         <ToastContainer
//           position="top-right"
//           autoClose={5000}
//           hideProgressBar={false}
//           newestOnTop={false}
//           closeOnClick
//           rtl={false}
//           pauseOnFocusLoss
//           draggable
//           pauseOnHover
//           theme="light"
//         />
//       </ChatProvider>
//     </AuthProvider>
//   );
// }

// export function head() {
//   return {
//     title: 'PawFi - Your Financial Companion',
//     meta: [
//       { charSet: 'utf-8' },
//       { name: 'viewport', content: 'width=device-width, initial-scale=1' },
//       { name: 'title', content: 'PawFi - Your Financial Companion' },
//       { name: 'description', content: 'PawFi helps you manage your finances with powerful tools and calculators for investments, mortgages, savings, and more.' },
//       {
//         name: 'keywords',
//         content: 'pawfi, finance, personal finance, financial calculators, investment calculator, mortgage calculator, savings calculator, retirement planning, auto loan',
//       },
//       { property: 'og:title', content: 'PawFi - Your Financial Companion' },
//       { property: 'og:description', content: 'Powerful financial tools and calculators at your fingertips.' },
//       // { property: 'og:image', content: 'https://pawfi.app/og-image.png' }, // Replace with your actual OG image URL
//       // { property: 'og:url', content: 'https://pawfi.app' }, // Replace with your actual site URL
//       // { name: 'twitter:card', content: 'summary_large_image' },
//     ],
//     link: [
//       { rel: 'icon', href: '/favicon.ico', type: 'image/x-icon' },
//     ],
//   };
// }
  
