import { FaqSection } from '@/components/ui/faq-section';

const retirementFaqData = [
  {
    question: "How much money do I need to retire?",
    answer: "A common rule of thumb is to save 10-12 times your annual pre-retirement income, but this varies based on your desired lifestyle, expected longevity, healthcare needs, and other factors. Our retirement calculator can help you determine a more personalized target based on your specific situation."
  },
  {
    question: "When should I start saving for retirement?",
    answer: "Ideally, you should start saving for retirement as soon as you begin earning income. The earlier you start, the more time your money has to grow through compound interest. Even small contributions in your 20s can have a significant impact on your retirement savings due to decades of potential growth."
  },
  {
    question: "What retirement accounts should I use?",
    answer: "Consider a mix of tax-advantaged accounts such as 401(k)s, IRAs (both traditional and Roth), and HSAs if eligible. The best combination depends on your tax situation, income level, and employer benefits. Diversifying across different account types provides tax flexibility in retirement."
  },
  {
    question: "How does inflation affect my retirement savings?",
    answer: "Inflation reduces the purchasing power of your money over time. For example, with 3% annual inflation, $100 today will only buy about $74 worth of goods in 10 years. When planning for retirement, it's crucial to account for inflation by either using inflation-adjusted returns in your calculations or targeting a higher savings amount."
  }
];

export const RetirementCalculatorSEOContent = () => {
  return (
    <section className="max-w-5xl mx-auto mt-16 mb-20 px-4 md:px-6 text-foreground dark:text-dark-foreground font-sans">
      <div className="mb-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground dark:text-dark-foreground">Planning Your Retirement</h2>
        <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto mb-6 rounded-full"></div>
        <p className="text-lg md:text-xl max-w-3xl mx-auto text-muted-foreground dark:text-dark-muted-foreground">
          Understand how to build and manage your retirement savings for a secure financial future
        </p>
      </div>

      {/* Introduction Card */}
      <div className="bg-card dark:bg-dark-card rounded-2xl shadow-sm p-6 md:p-8 mb-10 border border-subtle-border dark:border-dark-subtle-border">
        <h3 className="text-2xl font-bold mb-4 text-foreground dark:text-dark-foreground">How Does Retirement Planning Work?</h3>
        <p className="text-muted-foreground dark:text-dark-muted-foreground leading-relaxed">
          Retirement planning is the process of determining retirement income goals, the actions and decisions necessary to achieve those goals, and the appropriate management of assets. It includes identifying sources of income, estimating expenses, implementing a savings program, and managing assets and risk. Future cash flows are estimated to determine if the retirement income goal will be achieved. Proper retirement planning considers not just financial factors but also life expectancy, desired lifestyle, and potential healthcare needs.
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
            <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">Key Retirement Terms</h3>
          </div>
          <ul className="space-y-4">
            {[
              { term: 'Retirement Age', def: 'The age at which you plan to stop working and begin living off your retirement savings.' },
              { term: 'Retirement Corpus', def: 'The total amount of money you need to accumulate by retirement to fund your post-retirement lifestyle.' },
              { term: 'Withdrawal Rate', def: 'The percentage of your retirement savings you withdraw each year to cover living expenses.' },
              { term: 'Life Expectancy', def: 'The estimated number of years you are expected to live, which helps determine how long your retirement savings need to last.' },
              { term: 'Inflation', def: 'The rate at which the general level of prices for goods and services rises, eroding purchasing power over time.' }
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
            <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">Benefits of Retirement Planning</h3>
          </div>
          <ul className="space-y-4">
            {[
              { benefit: 'Financial Security', desc: 'Ensure you have enough money to maintain your desired lifestyle throughout retirement.' },
              { benefit: 'Peace of Mind', desc: 'Reduce anxiety about the future by having a clear plan for your financial needs.' },
              { benefit: 'Tax Advantages', desc: 'Take advantage of tax-deferred or tax-free growth in retirement accounts to maximize savings.' },
              { benefit: 'Legacy Planning', desc: 'Create a plan for transferring wealth to heirs or charitable causes after your lifetime.' },
              { benefit: 'Healthcare Readiness', desc: 'Prepare for potential medical expenses that often increase with age.' }
            ].map((item, index) => (
              <li key={index} className="flex">
                <span className="font-semibold text-secondary dark:text-dark-secondary min-w-[120px] md:min-w-[140px]">{item.benefit}:</span>
                <span className="text-muted-foreground dark:text-dark-muted-foreground">{item.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Retirement Strategies Section */}
      <div className="bg-gradient-to-br from-success/10 to-accent/10 dark:from-dark-success/10 dark:to-dark-accent/10 rounded-2xl shadow-sm p-6 md:p-8 mb-10 border border-success/20 dark:border-dark-success/20">
        <div className="flex items-center mb-6">
          <span className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </span>
          <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">Smart Retirement Strategies</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              tip: "Start Early",
              desc: "The power of compound interest means that even small amounts invested in your 20s and 30s can grow significantly by retirement age.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              )
            },
            {
              tip: "Maximize Employer Match",
              desc: "If your employer offers matching contributions to your retirement plan, contribute at least enough to get the full match—it's essentially free money.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              )
            },
            {
              tip: "Diversify Retirement Accounts",
              desc: "Consider a mix of traditional (tax-deferred) and Roth (tax-free growth) retirement accounts to provide tax flexibility in retirement.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              )
            },
            {
              tip: "Adjust Strategy Over Time",
              desc: "Gradually shift from growth-oriented investments to more conservative options as you approach retirement to protect your savings.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
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

      {/* The 4% Rule Section */}
      <div className="bg-gradient-to-br from-warning/10 to-warning/20 dark:from-dark-warning/10 dark:to-dark-warning/20 rounded-2xl shadow-sm p-6 md:p-8 mb-10 border border-warning/20 dark:border-dark-warning/20">
        <div className="flex items-center mb-4">
          <span className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          </span>
          <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">The 4% Rule</h3>
        </div>
        
        <p className="text-muted-foreground dark:text-dark-muted-foreground mb-6 leading-relaxed">
          The 4% rule is a guideline used to determine how much a retiree should withdraw from a retirement account each year. This rule seeks to provide a steady income stream while maintaining an account balance that keeps income flowing through retirement.
        </p>
        
        <div className="bg-card dark:bg-dark-card rounded-xl p-5 shadow-sm border border-subtle-border dark:border-dark-subtle-border">
          <h4 className="font-semibold text-foreground dark:text-dark-foreground mb-3">How it works:</h4>
          <ul className="space-y-3">
            <li className="flex items-center">
              <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mr-3 text-xs font-bold">1</span>
              <span className="text-muted-foreground dark:text-dark-muted-foreground">In the first year of retirement, withdraw 4% of your total retirement savings.</span>
            </li>
            <li className="flex items-center">
              <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mr-3 text-xs font-bold">2</span>
              <span className="text-muted-foreground dark:text-dark-muted-foreground">In subsequent years, adjust the dollar amount for inflation.</span>
            </li>
            <li className="flex items-center">
              <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mr-3 text-xs font-bold">3</span>
              <span className="text-muted-foreground dark:text-dark-muted-foreground">Example: With $1 million saved, you could withdraw $40,000 in year one, then adjust that amount for inflation in future years.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* FAQ Section */}
      <FaqSection faqData={retirementFaqData} />

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
}