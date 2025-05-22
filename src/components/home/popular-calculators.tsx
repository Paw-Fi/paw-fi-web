import { Link } from "@tanstack/react-router";
import compoundIcon from "@/assets/images/calculators/compound.svg";
import mortgageIcon from "@/assets/images/calculators/mortgage.svg";

export function PopularCalculators() {
  return (
    <section className="bg-gradient-to-br from-purple-50 to-blue-50 py-16 px-4 md:px-12">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-8 text-3xl md:text-4xl font-bold text-center">
          Popular Calculators
        </h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/calculators/compound-interest"
            className="group block rounded-2xl bg-white shadow-lg hover:shadow-xl transition p-6 border border-purple-100 hover:border-purple-300"
          >
            <img src={compoundIcon} alt="Compound Interest Icon" className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Compound Interest</h3>
            <p className="text-gray-600 mb-4">
              See how your savings grow over time with compounding.
            </p>
            <span className="inline-flex items-center text-purple-600 font-medium group-hover:underline">
              Try Now <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </span>
          </Link>
          <Link
            to="/calculators/mortgage"
            className="group block rounded-2xl bg-white shadow-lg hover:shadow-xl transition p-6 border border-purple-100 hover:border-purple-300"
          >
            <img src={mortgageIcon} alt="Mortgage Calculator Icon" className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Mortgage Calculator</h3>
            <p className="text-gray-600 mb-4">
              Get a detailed mortgage payment breakdown and amortization.
            </p>
            <span className="inline-flex items-center text-purple-600 font-medium group-hover:underline">
              Try Now <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </span>
          </Link>
        </div>
        <div className="mt-8 text-center">
          <Link
            to="/calculators"
            className="inline-block rounded-lg bg-purple-600 text-white px-6 py-3 font-semibold hover:bg-purple-700 transition"
          >
            View All Calculators
          </Link>
        </div>
      </div>
    </section>
  );
}
