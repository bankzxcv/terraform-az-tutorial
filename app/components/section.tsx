import React from 'react';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

export function Section({ title, children }: SectionProps): React.ReactElement {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-500">
        {title}
      </h2>
      <div className="prose prose-slate max-w-none">
        {children}
      </div>
    </section>
  );
}




