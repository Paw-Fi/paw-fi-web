export const CompoundCalculatorSEOContent = () => {
  return (
    <section className="max-w-5xl mx-auto mt-16 mb-20 px-4 md:px-6 text-gray-800 dark:text-gray-200 font-sans">
      <div className="mb-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground dark:text-dark-foreground">Understanding Compound Interest</h2>
        <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary dark:from-dark-primary dark:to-dark-secondary mx-auto mb-6 rounded-full"></div>
        <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-600 dark:text-gray-300">
          Discover the power of compound interest and how it can dramatically grow your investments over time
        </p>
      </div>

      {/* Introduction Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 md:p-8 mb-10 border border-gray-100 dark:border-gray-700">
        <h3 className="text-2xl font-bold mb-4 text-foreground dark:text-dark-foreground">How Does Compound Interest Work?</h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          Compound interest is often called the eighth wonder of the world for good reason. Unlike simple interest, which is calculated only on the initial principal, compound interest is calculated on both the initial principal and the accumulated interest from previous periods. This means your money grows exponentially over time, as you earn interest on your interest. The more frequently compounding occurs—daily, monthly, quarterly, or annually—the faster your investment grows.
        </p>
      </div>

      {/* Key Terms Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 dark:from-dark-primary/10 dark:to-dark-secondary/10 rounded-2xl shadow-sm p-6 md:p-8 border border-primary/20 dark:border-gray-700">
          <div className="flex items-center mb-5">
            <span className="w-10 h-10 rounded-full bg-primary dark:bg-dark-primary text-white flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </span>
            <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">Key Compound Interest Terms</h3>
          </div>
          <ul className="space-y-4">
            {[
              { term: 'Principal', def: 'The initial amount you invest or deposit.' },
              { term: 'Interest Rate', def: 'The annual percentage rate at which your money grows.' },
              { term: 'Compounding Frequency', def: 'How often interest is calculated and added to your principal (daily, monthly, quarterly, annually).' },
              { term: 'Time Period', def: 'The length of time your money will be invested and growing.' },
              { term: 'Future Value', def: 'The total amount your investment will be worth after the specified time period.' }
            ].map((item, index) => (
              <li key={index} className="flex">
                <span className="font-semibold text-primary dark:text-dark-primary min-w-[120px] md:min-w-[140px]">{item.term}:</span>
                <span className="text-gray-700 dark:text-gray-300">{item.def}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gradient-to-br from-secondary/10 to-accent-pink/10 dark:from-dark-secondary/10 dark:to-dark-accent-pink/10 rounded-2xl shadow-sm p-6 md:p-8 border border-secondary/20 dark:border-gray-700">
          <div className="flex items-center mb-5">
            <span className="w-10 h-10 rounded-full bg-secondary dark:bg-dark-secondary text-white flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
            </span>
            <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">Benefits of Compound Interest</h3>
          </div>
          <ul className="space-y-4">
            {[
              { benefit: 'Exponential Growth', desc: 'Your money grows at an increasing rate over time, not just linearly.' },
              { benefit: 'Passive Income', desc: 'Once invested, your money works for you with minimal additional effort.' },
              { benefit: 'Time Advantage', desc: 'The earlier you start investing, the more dramatic the compounding effect becomes.' },
              { benefit: 'Wealth Building', desc: 'Even small, regular investments can grow into substantial sums over long periods.' },
              { benefit: 'Financial Security', desc: 'Compound interest helps build wealth that can provide security in retirement or for future goals.' }
            ].map((item, index) => (
              <li key={index} className="flex">
                <span className="font-semibold text-secondary dark:text-dark-secondary min-w-[120px] md:min-w-[140px]">{item.benefit}:</span>
                <span className="text-gray-700 dark:text-gray-300">{item.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* The Power of Time Section */}
      <div className="bg-gradient-to-br from-success/10 to-success-light/50 dark:from-dark-success/10 dark:to-dark-success-light rounded-2xl shadow-sm p-6 md:p-8 mb-10 border border-success/20 dark:border-gray-700">
        <div className="flex items-center mb-6">
          <span className="w-10 h-10 rounded-full bg-success dark:bg-dark-success text-white flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </span>
          <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">Smart Investing Tips</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              tip: "Start Early",
              desc: "The earlier you start investing, the more time your money has to grow. Even small amounts can grow significantly over decades.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              )
            },
            {
              tip: "Increase Compounding Frequency",
              desc: "When possible, choose investments that compound more frequently (monthly or daily rather than annually).",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              )
            },
            {
              tip: "Reinvest Dividends",
              desc: "Automatically reinvesting dividends or interest payments accelerates the compounding effect.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              )
            },
            {
              tip: "Be Consistent",
              desc: "Regular contributions, even small ones, can dramatically increase your returns over time through dollar-cost averaging.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )
            }
          ].map((item, index) => (
            <div key={index} className="flex p-4 bg-gray-50 dark:bg-gray-750 rounded-xl">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-success/20 dark:bg-dark-success/20 text-success dark:text-dark-success flex items-center justify-center mr-4">
                {item.icon}
              </div>
              <div>
                <h4 className="font-semibold text-foreground dark:text-dark-foreground mb-1">{item.tip}</h4>
                <p className="text-gray-700 dark:text-gray-300 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The Rule of 72 Section */}
      <div className="bg-gradient-to-br from-warning/10 to-warning-light/50 dark:from-dark-warning/10 dark:to-dark-warning-light rounded-2xl shadow-sm p-6 md:p-8 mb-10 border border-warning/20 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <span className="w-10 h-10 rounded-full bg-warning dark:bg-dark-warning text-white flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          </span>
          <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">The Rule of 72</h3>
        </div>
        
        <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
          The Rule of 72 is a simple way to estimate how long it will take for your investment to double in value. Just divide 72 by your annual interest rate to get the approximate number of years.
        </p>
        
        <div className="bg-white dark:bg-gray-750 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-foreground dark:text-dark-foreground mb-3">Examples:</h4>
          <ul className="space-y-3">
            <li className="flex items-center">
              <span className="w-6 h-6 rounded-full bg-warning/20 dark:bg-dark-warning/20 text-warning dark:text-dark-warning flex items-center justify-center mr-3 text-xs font-bold">1</span>
              <span className="text-gray-700 dark:text-gray-300">At 6% interest, your money will double in approximately 72 ÷ 6 = 12 years</span>
            </li>
            <li className="flex items-center">
              <span className="w-6 h-6 rounded-full bg-warning/20 dark:bg-dark-warning/20 text-warning dark:text-dark-warning flex items-center justify-center mr-3 text-xs font-bold">2</span>
              <span className="text-gray-700 dark:text-gray-300">At 9% interest, your money will double in approximately 72 ÷ 9 = 8 years</span>
            </li>
            <li className="flex items-center">
              <span className="w-6 h-6 rounded-full bg-warning/20 dark:bg-dark-warning/20 text-warning dark:text-dark-warning flex items-center justify-center mr-3 text-xs font-bold">3</span>
              <span className="text-gray-700 dark:text-gray-300">At 12% interest, your money will double in approximately 72 ÷ 12 = 6 years</span>
            </li>
          </ul>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 rounded-2xl shadow-sm p-6 md:p-8 border border-gray-200 dark:border-gray-700">
        <h3 className="text-2xl font-bold mb-6 text-foreground dark:text-dark-foreground">Frequently Asked Questions</h3>
        
        <div className="space-y-6">
          {[
            {
              question: "How is compound interest different from simple interest?",
              answer: "Simple interest is calculated only on the original principal, while compound interest is calculated on both the principal and the accumulated interest. This means compound interest grows your money much faster over time."
            },
            {
              question: "What investments typically offer compound interest?",
              answer: "Many investments offer compound interest, including savings accounts, certificates of deposit (CDs), bonds, dividend-paying stocks (when dividends are reinvested), and mutual funds. The rate and compounding frequency vary by investment type."
            },
            {
              question: "How does compounding frequency affect my returns?",
              answer: "The more frequently interest compounds, the faster your money grows. For example, daily compounding will yield more than annual compounding at the same interest rate because interest is calculated and added to your principal more often."
            },
            {
              question: "Can compound interest work against me?",
              answer: "Yes, compound interest works against you with debt, especially high-interest debt like credit cards. The interest compounds on your outstanding balance, making the debt grow exponentially if not paid off."
            }
          ].map((item, index) => (
            <div key={index} className="bg-white dark:bg-gray-750 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-300">
              <h4 className="text-lg font-semibold mb-2 text-foreground dark:text-dark-foreground flex items-center">
                <span className="w-6 h-6 rounded-full bg-secondary dark:bg-dark-secondary text-white text-xs flex items-center justify-center mr-3">{index + 1}</span>
                {item.question}
              </h4>
              <p className="text-gray-700 dark:text-gray-300 pl-9">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-12 text-center">
        <p className="text-gray-600 dark:text-gray-400 mb-6">Ready to explore other calculators?</p>
        <a href="/calculators" className="inline-flex items-center justify-center px-6 py-3 bg-primary dark:bg-dark-primary text-white font-medium rounded-lg shadow-sm hover:bg-secondary dark:hover:bg-dark-secondary focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary focus:ring-offset-2 transition-colors duration-200">
          Try Our Calculators
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </a>
      </div>
    </section>
  );
}