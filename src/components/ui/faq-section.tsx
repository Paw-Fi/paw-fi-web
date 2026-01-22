import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

// Exported Component
export function FaqSection({ faqData, title = "Frequently Asked Questions" }: FaqSectionProps) {
  return (
    <section className="py-16 sm:py-20 md:py-24">
      <div className="mx-auto max-w-4xl">
        <h2 
          className="text-center text-2xl sm:text-3xl font-bold text-foreground mb-12 sm:mb-16"
      
        >
          {title}
        </h2>
        
        <div
        
        >
          <Accordion 
            type="single" 
            collapsible 
            className="w-full"
            defaultValue={faqData.length > 0 ? "item-0" : undefined}
          >
            {faqData.map((faq, index) => (
              <AccordionItem 
                key={`faq-${index}`} 
                value={`item-${index}`}
              >
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent className="text-balance">
                  <p>{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
