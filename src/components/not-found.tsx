// src/components/not-found.tsx
import React from 'react';

export function NotFound() {
  return (
    <section className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <h1 className="text-3xl font-bold text-red-600 mb-4">404 – Page Not Found</h1>
      <p className="mb-6 text-gray-700 max-w-lg">
        Sorry, the page you’re looking for doesn’t exist or has been moved.<br />
        Please check the URL or return to the <a href="/" className="text-blue-600 underline">homepage</a>.
      </p>
    </section>
  );
}
