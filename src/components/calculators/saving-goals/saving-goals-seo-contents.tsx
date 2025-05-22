export const SavingGoalsSEOContent = () => {
  return (
    <section className="max-w-5xl mx-auto mt-16 mb-20 px-4 md:px-6 text-gray-800 dark:text-gray-200 font-sans">
      <div className="mb-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">Achieving Your Saving Goals</h2>
        <div className="w-20 h-1 bg-gradient-to-r from-teal-500 to-cyan-600 mx-auto mb-6 rounded-full"></div>
        <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-600 dark:text-gray-300">
          Learn how to set, track, and achieve your financial saving goals with effective strategies
        </p>
      </div>

      {/* Introduction Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 md:p-8 mb-10 border border-gray-100 dark:border-gray-700">
        <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">How Do Saving Goals Work?</h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          Saving goals are specific financial targets that you set to accumulate a certain amount of money by a particular date. Whether you're saving for a down payment on a house, a dream vacation, education expenses, or an emergency fund, having clear goals helps you stay motivated and on track. A saving goals calculator helps you determine how much you need to save regularly to reach your target amount within your desired timeframe, taking into account your initial savings, regular contributions, and potential interest earnings.
        </p>
      </div>

      {/* Key Terms Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-gray-800 dark:to-gray-750 rounded-2xl shadow-sm p-6 md:p-8 border border-teal-100 dark:border-gray-700">
          <div className="flex items-center mb-5">
            <span className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Key Saving Terms</h3>
          </div>
          <ul className="space-y-4">
            {[
              { term: 'Target Amount', def: 'The total sum of money you aim to accumulate for your specific goal.' },
              { term: 'Time Horizon', def: 'The period over which you plan to save to reach your target amount.' },
              { term: 'Initial Deposit', def: 'The amount you already have saved toward your goal when you begin your saving plan.' },
              { term: 'Regular Contribution', def: 'The amount you plan to add to your savings on a recurring basis (weekly, monthly, etc.).' },
              { term: 'Interest Rate', def: 'The percentage at which your savings grow over time through interest earnings.' }
            ].map((item, index) => (
              <li key={index} className="flex">
                <span className="font-semibold text-teal-700 dark:text-teal-400 min-w-[120px] md:min-w-[140px]">{item.term}:</span>
                <span className="text-gray-700 dark:text-gray-300">{item.def}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-750 rounded-2xl shadow-sm p-6 md:p-8 border border-blue-100 dark:border-gray-700">
          <div className="flex items-center mb-5">
            <span className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
            </span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Benefits of Setting Saving Goals</h3>
          </div>
          <ul className="space-y-4">
            {[
              { benefit: 'Clarity', desc: 'Provides a clear target and timeline, making your financial planning more concrete and actionable.' },
              { benefit: 'Motivation', desc: 'Helps maintain focus and discipline by giving you a specific purpose for saving money.' },
              { benefit: 'Progress Tracking', desc: 'Allows you to measure your progress and make adjustments to your saving strategy as needed.' },
              { benefit: 'Financial Security', desc: 'Builds a financial safety net for expected expenses and unexpected emergencies.' },
              { benefit: 'Reduced Stress', desc: 'Alleviates financial anxiety by preparing in advance for major expenses.' }
            ].map((item, index) => (
              <li key={index} className="flex">
                <span className="font-semibold text-blue-700 dark:text-blue-400 min-w-[120px] md:min-w-[140px]">{item.benefit}:</span>
                <span className="text-gray-700 dark:text-gray-300">{item.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Saving Strategies Section */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-750 rounded-2xl shadow-sm p-6 md:p-8 mb-10 border border-green-100 dark:border-gray-700">
        <div className="flex items-center mb-6">
          <span className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </span>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Smart Saving Strategies</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              tip: "Automate Your Savings",
              desc: "Set up automatic transfers to your savings account on payday to ensure consistent contributions before you have a chance to spend the money.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              )
            },
            {
              tip: "Use the 50/30/20 Rule",
              desc: "Allocate 50% of your income to needs, 30% to wants, and 20% to savings and debt repayment to maintain a balanced financial approach.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              )
            },
            {
              tip: "Create Multiple Saving Buckets",
              desc: "Separate your savings into different accounts or categories for specific goals to better track progress and reduce the temptation to use funds for other purposes.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              )
            },
            {
              tip: "Cut Unnecessary Expenses",
              desc: "Regularly review your spending to identify and eliminate non-essential expenses, redirecting those funds toward your saving goals.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 9H10a3 3 0 013 3v1a1 1 0 102 0v-1a5 5 0 00-5-5H8.414l1.293-1.293z" clipRule="evenodd" />
                </svg>
              )
            }
          ].map((item, index) => (
            <div key={index} className="flex p-4 bg-gray-50 dark:bg-gray-750 rounded-xl">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mr-4">
                {item.icon}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{item.tip}</h4>
                <p className="text-gray-700 dark:text-gray-300 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SMART Goals Section */}
      <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-gray-800 dark:to-gray-750 rounded-2xl shadow-sm p-6 md:p-8 mb-10 border border-purple-100 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <span className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          </span>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Setting SMART Saving Goals</h3>
        </div>
        
        <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
          SMART is an acronym that stands for Specific, Measurable, Achievable, Relevant, and Time-bound. Using the SMART framework can help you create effective saving goals that you're more likely to achieve.
        </p>
        
        <div className="bg-white dark:bg-gray-750 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">The SMART Framework:</h4>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mr-3 text-xs font-bold mt-0.5">S</span>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Specific:</span>
                <span className="text-gray-700 dark:text-gray-300 ml-1">Define your goal clearly. Instead of "save money for a car," specify "save $10,000 for a down payment on a Toyota Camry."</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mr-3 text-xs font-bold mt-0.5">M</span>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Measurable:</span>
                <span className="text-gray-700 dark:text-gray-300 ml-1">Establish concrete criteria for measuring progress. Track how much you've saved and how close you are to your target amount.</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mr-3 text-xs font-bold mt-0.5">A</span>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Achievable:</span>
                <span className="text-gray-700 dark:text-gray-300 ml-1">Set goals that are realistic given your income and expenses. Saving 80% of your income might not be achievable, but 15-20% could be.</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mr-3 text-xs font-bold mt-0.5">R</span>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Relevant:</span>
                <span className="text-gray-700 dark:text-gray-300 ml-1">Ensure your goal aligns with your broader financial plans and life objectives. The goal should matter to you personally.</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mr-3 text-xs font-bold mt-0.5">T</span>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Time-bound:</span>
                <span className="text-gray-700 dark:text-gray-300 ml-1">Set a deadline for your goal. "Save $10,000 for a car down payment by December 31, 2026" gives you a clear timeframe.</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 rounded-2xl shadow-sm p-6 md:p-8 border border-gray-200 dark:border-gray-700">
        <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Frequently Asked Questions</h3>
        
        <div className="space-y-6">
          {[
            {
              question: "How much should I save each month?",
              answer: "The amount you should save monthly depends on your goal, timeframe, and financial situation. Financial experts often recommend saving at least 20% of your income, but this can vary. Our saving goals calculator can help you determine the specific amount needed to reach your target."
            },
            {
              question: "Where should I keep my savings?",
              answer: "The best place to keep your savings depends on your time horizon and risk tolerance. For short-term goals (under 3 years), consider high-yield savings accounts or certificates of deposit (CDs). For medium-term goals (3-10 years), you might consider a mix of CDs, bonds, and some conservative investments. For long-term goals (over 10 years), investment accounts may provide better growth potential."
            },
            {
              question: "What if I can't meet my saving target?",
              answer: "If you're struggling to meet your saving target, you have several options: extend your timeframe, reduce your target amount, increase your income through side hustles or career advancement, or cut expenses more aggressively. The key is to adjust your plan rather than abandoning it entirely."
            },
            {
              question: "Should I save or pay off debt first?",
              answer: "Generally, it's best to first build a small emergency fund (1-2 months of expenses), then focus on paying off high-interest debt (like credit cards), and then return to building your full savings. However, you might continue making minimum contributions to long-term goals like retirement even while paying down debt."
            }
          ].map((item, index) => (
            <div key={index} className="bg-white dark:bg-gray-750 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-300">
              <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white flex items-center">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center mr-3">{index + 1}</span>
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