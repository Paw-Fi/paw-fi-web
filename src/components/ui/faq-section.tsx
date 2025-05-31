import { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronUp, faChevronDown } from '@fortawesome/free-solid-svg-icons';

// Interfaces
interface FaqItemProps {
  question: string;
  answer: string;
  initiallyOpen?: boolean;
}

// Sub-components
function FaqItem({ question, answer, initiallyOpen = false }: FaqItemProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  return (
    <div className="border-b border-gray-200 py-6">
      <dt className="text-lg">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-start justify-between text-left text-gray-700 focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75"
          aria-expanded={isOpen}
        >
          <span className="font-medium">{question}</span>
          <span className="ml-6 flex h-7 items-center">
            <FontAwesomeIcon icon={isOpen ? faChevronUp : faChevronDown} className="h-6 w-6" />
          </span>
        </button>
      </dt>
      {isOpen && (
        <dd className="mt-2 pr-12">
          <p className="text-base text-gray-600 leading-relaxed">{answer}</p>
        </dd>
      )}
    </div>
  );
}

// Exported Component
export function FaqSection({ faqData }: { faqData: FaqItemProps[] }) {
  const faqSectionRef = useRef<HTMLDivElement>(null);

  return (
    <section ref={faqSectionRef} className="bg-slate-50 px-6 py-20 md:px-12 lg:px-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-10 text-center text-3xl font-bold text-slate-800 md:text-4xl">
          Frequently Asked Questions
        </h2>
        <dl className="space-y-2">
          {faqData.map((faq, _index) => (
            <div key={_index}>
              <FaqItem question={faq.question} answer={faq.answer} initiallyOpen={_index === 0} />
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
