export const AutoLoanCalculatorSEOContent = () => {
  return (
    <section className="max-w-5xl mx-auto mt-16 mb-20 px-4 md:px-6 text-gray-800 dark:text-gray-200 font-sans">
      <div className="mb-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">Understanding Auto Loan Calculations</h2>
        <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto mb-6 rounded-full"></div>
        <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-600 dark:text-gray-300">
          Make informed vehicle financing decisions with our comprehensive auto loan calculator guide
        </p>
      </div>

      {/* Introduction Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 md:p-8 mb-10 border border-gray-100 dark:border-gray-700">
        <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">How Do Auto Loans Work?</h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          Auto loans help you finance the purchase of a vehicle by spreading payments over time. The loan amount, interest rate, and term length determine your monthly payment. When you take out an auto loan, the vehicle serves as collateral, meaning the lender can repossess it if you fail to make payments. Understanding how different factors affect your loan can help you secure better terms and save money over time.
        </p>
      </div>

      {/* Key Terms Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-750 rounded-2xl shadow-sm p-6 md:p-8 border border-blue-100 dark:border-gray-700">
          <div className="flex items-center mb-5">
            <span className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Key Auto Loan Terms</h3>
          </div>
          <ul className="space-y-4">
            {[
              { term: 'Principal', def: 'The initial amount borrowed to purchase the vehicle.' },
              { term: 'Interest Rate', def: 'The percentage charged by the lender for borrowing the money, expressed as an annual percentage rate (APR).' },
              { term: 'Loan Term', def: 'The length of time you have to repay the loan, typically 36, 48, 60, or 72 months.' },
              { term: 'Down Payment', def: 'The upfront amount you pay toward the vehicle\'s purchase price, reducing the amount you need to borrow.' },
              { term: 'Trade-in Value', def: 'The value of your current vehicle that can be applied toward the purchase of your new vehicle.' }
            ].map((item, index) => (
              <li key={index} className="flex">
                <span className="font-semibold text-blue-700 dark:text-blue-400 min-w-[120px] md:min-w-[140px]">{item.term}:</span>
                <span className="text-gray-700 dark:text-gray-300">{item.def}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-750 rounded-2xl shadow-sm p-6 md:p-8 border border-purple-100 dark:border-gray-700">
          <div className="flex items-center mb-5">
            <span className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
            </span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Benefits of Using Our Calculator</h3>
          </div>
          <ul className="space-y-4">
            {[
              { benefit: 'Accuracy', desc: 'Get precise payment estimates based on current market rates and your specific loan details.' },
              { benefit: 'Transparency', desc: 'See exactly how taxes, fees, and trade-ins affect your total loan amount and monthly payments.' },
              { benefit: 'Comparison', desc: 'Compare different loan terms, interest rates, and down payment amounts to find your optimal auto loan.' },
              { benefit: 'Affordability', desc: 'Determine what vehicle price range fits your budget based on your desired monthly payment.' },
              { benefit: 'Negotiation', desc: 'Enter the dealership with confidence knowing exactly what terms you can afford.' }
            ].map((item, index) => (
              <li key={index} className="flex">
                <span className="font-semibold text-purple-700 dark:text-purple-400 min-w-[120px] md:min-w-[140px]">{item.benefit}:</span>
                <span className="text-gray-700 dark:text-gray-300">{item.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-750 rounded-2xl shadow-sm p-6 md:p-8 mb-10 border border-green-100 dark:border-gray-700">
        <div className="flex items-center mb-6">
          <span className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </span>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Smart Auto Loan Tips</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              tip: "Get Pre-approved",
              desc: "Secure financing before visiting dealerships to strengthen your negotiating position and avoid high-pressure sales tactics.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )
            },
            {
              tip: "Consider Total Cost",
              desc: "Look beyond the monthly payment to understand the total cost over the life of the loan, including interest, taxes, and fees.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              )
            },
            {
              tip: "Shorter Terms Save Money",
              desc: "While longer loan terms reduce monthly payments, they increase the total interest paid. Choose the shortest term you can comfortably afford.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              )
            },
            {
              tip: "Negotiate the Price, Not the Payment",
              desc: "Focus on negotiating the vehicle price rather than monthly payments. Dealers can manipulate payment amounts by extending the loan term.",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
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

      {/* FAQ Section */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 rounded-2xl shadow-sm p-6 md:p-8 border border-gray-200 dark:border-gray-700">
        <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Frequently Asked Questions</h3>
        
        <div className="space-y-6">
          {[
            {
              question: "How does my credit score affect my auto loan?",
              answer: "Your credit score significantly impacts your interest rate and loan approval. Higher scores typically qualify for lower rates, potentially saving you thousands over the life of the loan."
            },
            {
              question: "Should I accept dealer financing?",
              answer: "Dealer financing can be convenient, but it's not always the best deal. Compare offers from banks, credit unions, and online lenders before visiting the dealership to ensure you get the most competitive rate."
            },
            {
              question: "Can I refinance my auto loan?",
              answer: "Yes, refinancing is possible if interest rates drop or your credit improves. Refinancing can lower your monthly payment or reduce the total interest paid over the life of the loan."
            },
            {
              question: "What happens if I miss payments?",
              answer: "Missing payments can result in late fees, negative credit reporting, and eventually repossession of your vehicle. Contact your lender immediately if you're having trouble making payments."
            }
          ].map((item, index) => (
            <div key={index} className="bg-white dark:bg-gray-750 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-300">
              <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white flex items-center">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center mr-3">{index + 1}</span>
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