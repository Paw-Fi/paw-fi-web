import { FaqSection } from '@/components/ui/faq-section';

const investmentFaqData = [
  {
    question: "How accurate are investment projections?",
    answer: "Investment projections are estimates based on assumptions about future returns, contributions, and time periods. While they can be useful planning tools, actual results will vary due to market fluctuations, economic conditions, and other factors that cannot be precisely predicted."
  },
  {
    question: "What rate of return should I use for my projections?",
    answer: "Historical average returns vary by asset class: stocks have averaged around 7-10% annually over long periods, bonds 3-5%, and cash 1-2%. However, past performance doesn't guarantee future results. Consider using conservative estimates based on your asset allocation and time horizon."
  },
  {
    question: "How often should I review my investment projections?",
    answer: "Review your projections at least annually or when significant life events occur (job change, marriage, children). Regular reviews help you adjust your strategy based on actual performance, changing goals, or shifts in your financial situation."
  },
  {
    question: "Should I account for inflation in my projections?",
    answer: "Yes, inflation reduces the purchasing power of your money over time. For realistic projections, either use inflation-adjusted (real) returns in your calculations or factor in an inflation rate (typically 2-3%) when determining if your future savings will meet your goals."
  }
];

export const InvestmentCalculatorSEOContent = () => {
  return (
    <section className="max-w-5xl mx-auto mt-16 mb-20 px-4 md:px-6 text-gray-800 dark:text-gray-200 font-sans">
      <div className="mb-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground dark:text-dark-foreground">Understanding Investment Growth</h2>
        <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary dark:from-dark-primary dark:to-dark-secondary mx-auto mb-6 rounded-full"></div>
        <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-600 dark:text-gray-300">
          Learn how to project and optimize your investment growth with our comprehensive guide
        </p>
      </div>

      {/* Introduction Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 md:p-8 mb-10 border border-gray-100 dark:border-gray-700">
        <h3 className="text-2xl font-bold mb-4 text-foreground dark:text-dark-foreground">How Do Investment Projections Work?</h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          Investment projections help you visualize how your money might grow over time based on different variables. By accounting for factors like initial investment amount, regular contributions, expected rate of return, and time horizon, you can create realistic forecasts of your future wealth. These projections allow you to adjust your investment strategy, set achievable financial goals, and understand the potential impact of different investment decisions.
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
            <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">Key Investment Terms</h3>
          </div>
          <ul className="space-y-4">
            {[
              { term: 'Initial Investment', def: 'The starting amount you put into your investment.' },
              { term: 'Regular Contributions', def: 'Additional money you add to your investment on a recurring basis (monthly, quarterly, annually).' },
              { term: 'Rate of Return', def: 'The percentage gain or loss on an investment over a specified period, usually expressed as an annual percentage.' },
              { term: 'Time Horizon', def: 'The length of time you expect to hold your investment before needing the funds.' },
              { term: 'Asset Allocation', def: 'The distribution of investments across different asset categories, such as stocks, bonds, and cash.' }
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
            <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">Benefits of Investment Planning</h3>
          </div>
          <ul className="space-y-4">
            {[
              { benefit: 'Goal Setting', desc: 'Define clear financial objectives with specific timelines and amounts.' },
              { benefit: 'Risk Management', desc: 'Understand potential outcomes and adjust your strategy to match your risk tolerance.' },
              { benefit: 'Decision Making', desc: 'Make informed choices about contribution amounts, investment vehicles, and time horizons.' },
              { benefit: 'Motivation', desc: 'Visualize future growth to stay motivated and committed to your investment plan.' },
              { benefit: 'Course Correction', desc: 'Regularly compare actual performance against projections to make necessary adjustments.' }
            ].map((item, index) => (
              <li key={index} className="flex">
                <span className="font-semibold text-secondary dark:text-dark-secondary min-w-[120px] md:min-w-[140px]">{item.benefit}:</span>
                <span className="text-gray-700 dark:text-gray-300">{item.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Investment Strategies Section */}
      <div className="bg-gradient-to-br from-success/10 to-success-light/50 dark:from-dark-success/10 dark:to-dark-success-light rounded-2xl shadow-sm p-6 md:p-8 mb-10 border border-success/20 dark:border-gray-700">
        <div className="flex items-center mb-6">
          <span className="w-10 h-10 rounded-full bg-success dark:bg-dark-success text-white flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </span>
          <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">Smart Investment Strategies</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              tip: "Dollar-Cost Averaging",
              desc: "Invest a fixed amount regularly regardless of market conditions to reduce the impact of volatility and avoid timing the market.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              )
            },
            {
              tip: "Diversification",
              desc: "Spread investments across various asset classes, sectors, and geographic regions to reduce risk and potentially improve returns.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              )
            },
            {
              tip: "Rebalancing",
              desc: "Periodically adjust your portfolio back to your target asset allocation to maintain your desired risk level and investment strategy.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              )
            },
            {
              tip: "Tax-Efficient Investing",
              desc: "Utilize tax-advantaged accounts and consider the tax implications of your investment decisions to maximize after-tax returns.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
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

      {/* Understanding Risk and Return Section */}
      <div className="bg-gradient-to-br from-warning/10 to-warning-light/50 dark:from-dark-warning/10 dark:to-dark-warning-light rounded-2xl shadow-sm p-6 md:p-8 mb-10 border border-warning/20 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <span className="w-10 h-10 rounded-full bg-warning dark:bg-dark-warning text-white flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </span>
          <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">Understanding Risk and Return</h3>
        </div>
        
        <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
          The relationship between risk and return is fundamental to investing. Generally, investments with higher potential returns come with higher risks. Understanding your risk tolerance is essential for creating an investment strategy that you can stick with through market fluctuations.
        </p>
        
        <div className="bg-white dark:bg-gray-750 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-foreground dark:text-dark-foreground mb-3">Common Investment Risk Types:</h4>
          <ul className="space-y-3">
            <li className="flex items-center">
              <span className="w-6 h-6 rounded-full bg-warning/20 dark:bg-dark-warning/20 text-warning dark:text-dark-warning flex items-center justify-center mr-3 text-xs font-bold">1</span>
              <span className="text-gray-700 dark:text-gray-300"><span className="font-medium">Market Risk:</span> The possibility of investments declining due to economic developments or other events that affect the entire market.</span>
            </li>
            <li className="flex items-center">
              <span className="w-6 h-6 rounded-full bg-warning/20 dark:bg-dark-warning/20 text-warning dark:text-dark-warning flex items-center justify-center mr-3 text-xs font-bold">2</span>
              <span className="text-gray-700 dark:text-gray-300"><span className="font-medium">Inflation Risk:</span> The risk that investment returns won't keep pace with inflation, reducing purchasing power over time.</span>
            </li>
            <li className="flex items-center">
              <span className="w-6 h-6 rounded-full bg-warning/20 dark:bg-dark-warning/20 text-warning dark:text-dark-warning flex items-center justify-center mr-3 text-xs font-bold">3</span>
              <span className="text-gray-700 dark:text-gray-300"><span className="font-medium">Liquidity Risk:</span> The risk of not being able to sell an investment quickly without a significant loss in value.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* FAQ Section */}
      <FaqSection faqData={investmentFaqData} />

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