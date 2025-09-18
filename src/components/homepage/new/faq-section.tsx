import { useState } from "react";
import faqData from "@/data/home/home-faq.json";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = faqData;

export default function FAQSection() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <section className="relative z-10 min-h-screen flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl w-full">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 text-sm font-medium text-primary">
            Frequently Asked Questions
          </div>
          
          <h2 className="text-foreground mb-4 text-3xl leading-tight font-bold sm:text-4xl md:text-5xl font-lato">
            Common Questions
          </h2>
          
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto font-lato">
            Everything you need to know about getting started with Moneko
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div 
              key={item.id}
              className="backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer p-6 border border-white/20"
              onClick={() => toggleItem(item.id)}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground text-lg leading-tight flex-1 font-lato">
                  {item.question}
                </h4>
                <div className={`ml-4 transition-transform duration-200 ${
                  openItems.has(item.id) ? 'rotate-180' : ''
                }`}>
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <>
                {openItems.has(item.id) && (
                  <div className="mt-4">
                    <p className="text-muted-foreground leading-relaxed font-lato">
                      {item.answer}
                    </p>
                  </div>
                )}
              </>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}