import { motion } from 'framer-motion';
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
    <section className="py-20 px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <motion.h2 
          className="text-center text-4xl md:text-5xl font-bold text-foreground mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          {title}
        </motion.h2>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
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
        </motion.div>
      </div>
    </section>
  );
}
