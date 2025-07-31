import { FaqSection } from '@/components/ui/faq-section';

const mortgageFaqData = [
  {
    question: "What is PMI and when is it required?",
    answer: "Private Mortgage Insurance (PMI) is typically required if your down payment is less than 20% of the home's value. It protects the lender in case you default on the loan."
  },
  {
    question: "How does the interest rate affect my mortgage?",
    answer: "A lower interest rate reduces your monthly payment and the total interest paid over the life of the loan. Even a small difference in rate can have a big impact."
  },
  {
    question: "Can I pay off my mortgage early?",
    answer: "Yes, most mortgages allow early repayment. Making extra payments toward your principal can help you pay off your loan sooner and save on interest."
  },
  {
    question: "What is an amortization schedule?",
    answer: "An amortization schedule is a table showing each monthly payment, how much goes toward principal and interest, and the remaining loan balance after each payment."
  }
];

export const MortgageCalculatorSEOContent = () => {
  return (
    <section className="max-w-5xl mx-auto mt-16 mb-20 px-4 md:px-6 text-foreground dark:text-dark-foreground font-sans">
      <div className="mb-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground dark:text-dark-foreground">Understanding Mortgage Calculations</h2>
        <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto mb-6 rounded-full"></div>
        <p className="text-lg md:text-xl max-w-3xl mx-auto text-muted-foreground dark:text-dark-muted-foreground">
          Make informed home buying decisions with our comprehensive mortgage calculator guide
        </p>
      </div>

      {/* Introduction Card */}
      <div className="bg-card dark:bg-dark-card rounded-2xl shadow-sm p-6 md:p-8 mb-10 border border-subtle-border dark:border-dark-subtle-border">
        <h3 className="text-2xl font-bold mb-4 text-foreground dark:text-dark-foreground">How Does a Mortgage Calculator Work?</h3>
        <p className="text-muted-foreground dark:text-dark-muted-foreground leading-relaxed">
          A mortgage calculator helps you estimate your monthly home loan payments based on the loan amount, interest rate, term, and other factors. By inputting your details, you can quickly see how changes in down payment, interest rates, or loan terms affect your payment and the total interest paid over the life of the loan.
        </p>
      </div>

      {/* Key Terms Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-dark-primary/5 dark:to-dark-primary/10 rounded-2xl shadow-sm p-6 md:p-8 border border-primary/20 dark:border-dark-primary/20">
          <div className="flex items-center mb-5">
            <span className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </span>
            <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">Key Mortgage Terms</h3>
          </div>
          <ul className="space-y-4">
            {[
              { term: 'Principal', def: 'The amount you borrow from the lender to purchase your home.' },
              { term: 'Interest', def: 'The cost charged by the lender for borrowing money, typically expressed as an annual percentage rate (APR).' },
              { term: 'Down Payment', def: 'The upfront amount you pay toward the home\'s purchase price, reducing the amount you need to borrow.' },
              { term: 'Loan Term', def: 'The length of time you have to repay the loan, commonly 15 or 30 years.' },
              { term: 'Amortization', def: 'The process of paying off your loan through regular payments over time, with each payment covering both principal and interest.' }
            ].map((item, index) => (
              <li key={index} className="flex">
                <span className="font-semibold text-primary dark:text-dark-primary min-w-[120px] md:min-w-[140px]">{item.term}:</span>
                <span className="text-muted-foreground dark:text-dark-muted-foreground">{item.def}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gradient-to-br from-secondary/10 to-accent/10 dark:from-dark-secondary/10 dark:to-dark-accent/10 rounded-2xl shadow-sm p-6 md:p-8 border border-secondary/20 dark:border-dark-secondary/20">
          <div className="flex items-center mb-5">
            <span className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
            </span>
            <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">Benefits of Using Our Calculator</h3>
          </div>
          <ul className="space-y-4">
            {[
              { benefit: 'Accuracy', desc: 'Get precise payment estimates based on current market rates and your specific loan details.' },
              { benefit: 'Transparency', desc: 'See exactly how much of your payment goes toward principal vs. interest each month.' },
              { benefit: 'Scenario Testing', desc: 'Compare different loan terms, interest rates, and down payment amounts to find your optimal mortgage.' },
              { benefit: 'Cost Awareness', desc: 'Understand the total cost of your loan over its entire term, including all interest paid.' },
              { benefit: 'Budget Planning', desc: 'Plan your housing budget more effectively with accurate monthly payment estimates.' }
            ].map((item, index) => (
              <li key={index} className="flex">
                <span className="font-semibold text-secondary dark:text-dark-secondary min-w-[120px] md:min-w-[140px]">{item.benefit}:</span>
                <span className="text-muted-foreground dark:text-dark-muted-foreground">{item.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-gradient-to-br from-success/10 to-accent/10 dark:from-dark-success/10 dark:to-dark-accent/10 rounded-2xl shadow-sm p-6 md:p-8 mb-10 border border-success/20 dark:border-dark-success/20">
        <div className="flex items-center mb-6">
          <span className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </span>
          <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">Smart Mortgage Tips</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              tip: "Consider the Total Cost",
              desc: "Look beyond the monthly payment to understand the total cost over the life of the loan.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              )
            },
            {
              tip: "Don't Forget Extra Costs",
              desc: "Remember to include property taxes, insurance, PMI, HOA fees, and other expenses in your budget.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 9H10a3 3 0 013 3v1a1 1 0 102 0v-1a5 5 0 00-5-5H8.414l1.293-1.293z" clipRule="evenodd" />
                </svg>
              )
            },
            {
              tip: "Shop Around for Rates",
              desc: "Even a 0.5% difference in interest rate can save you thousands over the life of your loan.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                </svg>
              )
            },
            {
              tip: "Consider Loan Term Carefully",
              desc: "A shorter term means higher payments but less interest paid overall.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              )
            }
          ].map((item, index) => (
            <div key={index} className="flex p-4 bg-subtle-background dark:bg-dark-subtle-background rounded-xl">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mr-4">
                {item.icon}
              </div>
              <div>
                <h4 className="font-semibold text-foreground dark:text-dark-foreground mb-1">{item.tip}</h4>
                <p className="text-muted-foreground dark:text-dark-muted-foreground text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <FaqSection faqData={mortgageFaqData} />

      {/* CTA Section */}
      <div className="mt-12 text-center">
        <p className="text-muted-foreground dark:text-dark-muted-foreground mb-6">Ready to explore other calculators?</p>
        <a href="/calculators" className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">
          Try Our Calculators
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </a>
      </div>
    </section>
  );
};
