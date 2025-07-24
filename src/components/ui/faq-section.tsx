import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronUp, faChevronDown } from '@fortawesome/free-solid-svg-icons';

// Interfaces
interface FaqItemProps {
  question: string;
  answer: string;
  initiallyOpen?: boolean;
}

interface FaqSectionProps {
  faqData: FaqItemProps[];
  title?: string;
}

// Sub-components
function FaqItem({ question, answer, initiallyOpen = false }: FaqItemProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [height, setHeight] = useState<number | string>(initiallyOpen ? 'auto' : 0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 py-6 px-4 -mx-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200">
      <dt className="text-lg">
        <button
          onClick={toggleOpen}
          className="group flex w-full items-start justify-between text-left text-foreground dark:text-dark-foreground hover:text-primary dark:hover:text-dark-primary focus:outline-none focus-visible:ring focus-visible:ring-primary dark:focus-visible:ring-dark-primary focus-visible:ring-opacity-75 transition-colors duration-200"
          aria-expanded={isOpen}
        >
          <span className="font-medium">{question}</span>
          <span className="ml-6 flex h-7 items-center">
            <FontAwesomeIcon 
              icon={isOpen ? faChevronUp : faChevronDown} 
              className="h-6 w-6 text-gray-500 dark:text-gray-400 group-hover:text-primary dark:group-hover:text-dark-primary transition-all duration-200 ease-in-out"
            />
          </span>
        </button>
      </dt>
      <div 
        style={{ height }}
        className="overflow-hidden transition-all duration-300 ease-in-out"
      >
        <dd ref={contentRef} className="mt-2 pr-12">
          <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">{answer}</p>
        </dd>
      </div>
    </div>
  );
}

// Exported Component
export function FaqSection({ faqData, title = "Frequently Asked Questions" }: FaqSectionProps) {
  const faqSectionRef = useRef<HTMLDivElement>(null);

  return (
    <section ref={faqSectionRef} className="px-6 py-20 md:px-12 lg:px-24 relative overflow-hidden">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-10 text-center text-3xl font-bold text-foreground dark:text-dark-foreground md:text-4xl">
          {title}
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
