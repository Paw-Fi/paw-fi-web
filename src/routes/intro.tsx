import { createFileRoute } from '@tanstack/react-router'
import catIcon from '../assets/cat-icon.svg'

export const Route = createFileRoute('/intro')({
  component: IntroPage,
})

function IntroPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-light">
      <div className="bg-white rounded-3xl overflow-hidden shadow-lg max-w-md w-full relative">
        {/* Wavy purple header */}
        <div className="relative h-32 bg-primary">
          <div className="absolute inset-x-0 bottom-0">
            <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-20">
              <path
                d="M0,100 C150,200 350,0 500,100 L500,0 L0,0 Z"
                className="fill-white"
              ></path>
            </svg>
          </div>
          <h1 className="relative text-center pt-8 text-2xl font-bold text-gray-800">
            Welcome to PawFi!
          </h1>
        </div>

        <div className="p-6 text-center">
          {/* Cat icon */}
          <div className="flex justify-center -mt-8 mb-6">
            <img src={catIcon} alt="PawFi Cat" className="w-24 h-24" />
          </div>

          {/* Introduction text */}
          <p className="text-gray-700 text-sm md:text-base">
            I'm PawFi, your personal finance guide! I'm here to help you save and invest
            toward your life goals. Let's create a <span className="font-semibold">personalized plan</span> that fits your needs
            and goals. Ready to start your financial journey?
          </p>

          {/* Get started button */}
          <button
            className="mt-6 w-full py-3 px-6 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition duration-300 text-sm font-medium"
          >
            Let's get started!
          </button>
        </div>
      </div>
    </div>
  )
}
