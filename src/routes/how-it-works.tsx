import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { 
  Users, 
  Wallet, 
  Mic, 
  TrendingUp, 
  CheckCircle2,
  Lock,
  ShieldCheck,
  MessageSquare,
  Camera,
  ArrowRight
} from 'lucide-react'
import { BentoCard } from "@/components/ui/bento-card"
import { HomeHeader } from "@/components/index/header"
import { Footer } from "@/components/homepage/footer"
import { Helmet } from "@dr.pogodin/react-helmet"
import { getCanonicalUrl } from "@/utils/canonical"
import { seo } from "@/utils/seo"
import { getCurrencySymbolBasedOnTimeZone } from "@/utils/currency-symbols"
import { AppleDownloadButton } from "@/components/ui/apple-download-button"
import { AndroidDownloadButton } from "@/components/ui/android-download-button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const META_TITLE = "How Moneko Works - AI Budgeting Simplified"
const META_DESCRIPTION = "See how Moneko uses AI to simplify personal and household finance. From voice capture to envelope budgeting and WhatsApp integration."

export const Route = createFileRoute('/how-it-works')({
  component: HowItWorksPage,
  head: () => {
    const pageUrl = getCanonicalUrl("/how-it-works")
    return {
      meta: seo({
        title: META_TITLE,
        description: META_DESCRIPTION,
        url: pageUrl,
      })
    }
  }
})

function HowItWorksPage() {
  const currencySymbol = getCurrencySymbolBasedOnTimeZone()
  const pageUrl = getCanonicalUrl("/how-it-works")

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        "url": pageUrl,
        "name": META_TITLE,
        "description": META_DESCRIPTION,
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://moneko.io" },
            { "@type": "ListItem", "position": 2, "name": "How It Works" }
          ]
        }
      },
      {
        "@type": "HowTo",
        "name": "How to Use Moneko for Simple Budgeting",
        "description": META_DESCRIPTION,
        "step": [
          {
            "@type": "HowToStep",
            "name": "Setup & Context",
            "text": "Choose between Personal or Household mode to manage private or shared finances."
          },
          {
            "@type": "HowToStep",
            "name": "Fast Capture",
            "text": "Log expenses effortlessly using voice notes, text messages, or receipt photos."
          },
          {
            "@type": "HowToStep",
            "name": "Budget with Pockets",
            "text": "Allocate your monthly budget into digital envelopes (Pockets) to give every dollar a job."
          },
          {
            "@type": "HowToStep",
            "name": "Insights & Planning",
            "text": "Use AI scenario planning to ask 'What if?' questions and forecast your future balance."
          }
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen relative bg-white dark:bg-[#050505] overflow-hidden font-sans selection:bg-gray-100 dark:selection:bg-gray-800">
      <Helmet>
        <title>{META_TITLE}</title>
        <meta name="description" content={META_DESCRIPTION} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      {/* Background Decor - Subtle Technical Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <HomeHeader />

      <main className="relative z-10 pt-32 px-4 md:px-6 max-w-[1200px] mx-auto">
        
        {/* Hero Section */}
        <section className="container px-4 md:px-6 mx-auto mb-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-sm font-medium mb-6">
                 <CheckCircle2 className="w-3 h-3 fill-current" />
                 The Moneko Workflow
              </span>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
                Budgeting that doesn't <br />
                <span className="text-slate-500 dark:text-slate-400">feel like work.</span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                Most apps demand hours of manual entry. Moneko focuses on fast capture, clear envelopes, and instant answers 
                so you can get on with your life.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <AppleDownloadButton />
              <AndroidDownloadButton />
            </motion.div>
          </div>
        </section>

        {/* Bento Grid: The 4 Steps */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[auto] md:auto-rows-[550px] mb-32">
            
            {/* Step 1: Setup (Wide) */}
            <BentoCard className="md:col-span-2 overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row">
                <div className="flex-1 p-8 md:p-12 flex flex-col justify-center z-10 relative order-2 md:order-1">
                   <div className="w-10 h-10 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center mb-6 text-slate-900 dark:text-white shadow-sm">
                        <Users className="w-5 h-5" />
                   </div>
                   <h3 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4">Context Matters.</h3>
                   <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-sm">
                       Start by choosing between <strong>Personal</strong> or <strong>Household</strong> mode. 
                       Manage your own spending privately, or track shared bills with a partner using multi-currency support.
                   </p>
                </div>
                <div className="flex-1 relative min-h-[350px] md:min-h-auto flex items-center justify-center p-8 order-1 md:order-2 bg-gradient-to-b from-transparent to-black/5 dark:to-white/5">
                    <SetupVisual />
                </div>
            </BentoCard>

            {/* Step 2: Capture (Tall) */}
            <BentoCard className="relative overflow-hidden bg-white dark:bg-black border border-gray-200 dark:border-gray-800 flex flex-col pt-8">
                 <div className="px-8 w-full z-10 shrink-0">
                     <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center mb-4 text-slate-600 dark:text-slate-400">
                         <Mic className="w-5 h-5" />
                     </div>
                     <h3 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mb-2">Fast Capture</h3>
                     <p className="text-slate-500 dark:text-slate-400 text-base">
                        Don't fill forms. Just tell us what happened via Text, Voice, or Receipt Photo.
                     </p>
                 </div>
                 <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden p-8">
                    <CaptureVisual currencySymbol={currencySymbol} />
                 </div>
            </BentoCard>

            {/* Step 3: Pockets (Tall) */}
             <BentoCard className="xs:col-span-1 border border-gray-200 dark:border-gray-800 bg-white dark:bg-black flex flex-col p-8 justify-between relative overflow-hidden">
                <div className="z-10">
                   <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center mb-4 text-slate-600 dark:text-slate-400">
                         <Wallet className="w-5 h-5" />
                   </div>
                   <h3 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mb-2">Pockets System</h3>
                   <p className="text-slate-500 dark:text-slate-400 text-base mb-6">
                       Give every dollar a job. Split your budget into envelopes for Rent, Fun, and Goals.
                   </p>
                </div>
                <div className="flex justify-center items-end flex-1 w-full">
                     <PocketsVisual currencySymbol={currencySymbol} />
                </div>
             </BentoCard>

             {/* Step 4: Insights (Wide) */}
             <BentoCard className="md:col-span-2 overflow-hidden bg-slate-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row-reverse">
                <div className="flex-1 p-8 md:p-12 flex flex-col justify-center z-10 relative">
                   <div className="w-10 h-10 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center mb-6 text-slate-900 dark:text-white shadow-sm">
                        <TrendingUp className="w-5 h-5" />
                   </div>
                   <h3 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4">Ask, don't calculate.</h3>
                   <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-md">
                       Use Scenario Planning to ask "What if?" questions. Moneko forecasts your future balance instantly.
                   </p>
                </div>
                <div className="flex-1 relative min-h-[300px] flex items-center justify-center p-8 bg-gradient-to-t from-transparent to-white/50 dark:to-black/50">
                    <InsightsVisual currencySymbol={currencySymbol} />
                </div>
            </BentoCard>

        </section>

        {/* WhatsApp Integration Section - Science Style */}
        <section className="container px-4 py-24 mx-auto border-t border-slate-100 dark:border-slate-800">
           <div className="max-w-4xl mx-auto space-y-12">
              <div className="text-center">
                 <div className="inline-flex items-center gap-2 mb-4">
                     <Badge variant="outline" className="bg-[#25D366]/5 dark:bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20">
                         WhatsApp Integrated
                     </Badge>
                 </div>
                 <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Moneko lives in your chat.</h2>
                 <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    No need to open the app. Add transactions, check budgets, and get summaries right from WhatsApp.
                 </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                 <div className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <div className="w-12 h-12 bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-center mb-6 shadow-sm">
                        <MessageSquare className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">Instant Logging</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        "Spent {currencySymbol}12 on lunch." It's categorized and saved instantly.
                    </p>
                 </div>

                 <div className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <div className="w-12 h-12 bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-center mb-6 shadow-sm">
                        <Wallet className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">Budget Checks</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        "How much for groceries?" Get real-time updates on your pockets.
                    </p>
                 </div>

                 <div className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                     <div className="w-12 h-12 bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-center mb-6 shadow-sm">
                        <TrendingUp className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">Visual Charts</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Ask for a spending graph and get a visual chart directly in the chat.
                    </p>
                 </div>
              </div>
              
              <div className="text-center">
                   <Link to="/features/whatsapp-assistant">
                        <div className="inline-flex items-center text-sm font-medium text-slate-900 dark:text-white hover:text-primary transition-colors cursor-pointer group">
                             Explore WhatsApp Assistant <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                        </div>
                   </Link>
              </div>
           </div>
        </section>

         {/* Bottom CTA */}
         <section className="container px-4 py-24 mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">Ready for a simpler system?</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-xl mx-auto">Join thousands managing their money with clearer insights and less work.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <AppleDownloadButton />
              <AndroidDownloadButton />
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 text-slate-500 dark:text-slate-400 text-sm font-medium">
                <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Private by Default</span>
                <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Secure Encryption</span>
            </div>
         </section>
      </main>

      <Footer />
    </div>
  )
}

// --- Visual Components (Minimalist Aesthetic) ---

function SetupVisual() {
    return (
        <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-700 w-full max-w-sm rotate-1 hover:rotate-0 transition-transform duration-500">
            <div className="flex justify-between items-center mb-8 bg-slate-100 dark:bg-slate-900 p-1 rounded-full w-fit mx-auto">
                 <div className="px-5 py-2 rounded-full bg-white dark:bg-slate-800 shadow-sm text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">Personal</div>
                 <div className="px-5 py-2 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-default">Household</div>
            </div>
             <div className="space-y-4">
                 <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                     <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white font-bold border border-slate-200 dark:border-slate-700 shadow-sm">$</div>
                     <div>
                         <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Base Currency</div>
                         <div className="font-semibold text-slate-900 dark:text-white">USD ($)</div>
                     </div>
                 </div>
                 <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                     <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-sm">
                        <Users className="w-5 h-5" />
                     </div>
                     <div>
                         <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Setup</div>
                         <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Solo Workspace</div>
                     </div>
                 </div>
             </div>
        </div>
    )
}

function CaptureVisual({ currencySymbol }: { currencySymbol: string }) {
    return (
        <div className="flex flex-col gap-4 w-full max-w-[280px]">
             <motion.div 
               className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-4 flex items-center gap-3 relative z-30"
               initial={{ x: -10, opacity: 0 }}
               whileInView={{ x: 0, opacity: 1 }}
               transition={{ duration: 0.5 }}
             >
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                      <MessageSquare className="w-4 h-4" />
                </div>
                <div className="text-xs">
                    <span className="text-slate-400">Text: </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">"Lunch {currencySymbol}15"</span>
                </div>
             </motion.div>

             <motion.div 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg rounded-2xl p-4 flex items-center gap-3 ml-4 relative z-20"
                initial={{ x: 10, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
             >
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                      <Mic className="w-4 h-4" />
                </div>
                <div className="text-xs">
                    <span className="text-slate-400">Voice: </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Processing...</span>
                </div>
             </motion.div>

             <motion.div 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-4 flex items-center gap-3 relative z-10"
                initial={{ y: 10, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
             >
                 <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                      <Camera className="w-4 h-4" />
                </div>
                <div className="text-xs">
                    <span className="text-slate-400">Scan: </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Total {currencySymbol}43.20</span>
                </div>
             </motion.div>
        </div>
    )
}

function PocketsVisual({ currencySymbol }: { currencySymbol: string }) {
    return (
          <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-inner rounded-3xl p-6">
              <div className="flex justify-between items-end mb-6">
                  <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Monthly Budget</div>
                      <div className="text-xl font-bold text-slate-900 dark:text-white">{currencySymbol}3,200</div>
                  </div>
              </div>
              
              <div className="space-y-5">
                  {[
                      { name: 'Needs', val: 75 },
                      { name: 'Fun', val: 45 },
                      { name: 'Goals', val: 10 }
                  ].map((item, i) => (
                      <div key={i}>
                          <div className="flex justify-between text-xs mb-2">
                              <span className="font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                              <span className="text-slate-400">{item.val}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-slate-900 dark:bg-white"
                                initial={{ width: 0 }}
                                whileInView={{ width: `${item.val}%` }}
                                transition={{ duration: 1, delay: i * 0.2 }}
                              />
                          </div>
                      </div>
                  ))}
              </div>
          </div>
    )
}

function InsightsVisual({ currencySymbol }: { currencySymbol: string }) {
    return (
        <div className="relative bg-white dark:bg-black rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm">
            <div className="space-y-6">
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl rounded-tl-none border border-slate-100 dark:border-slate-800">
                       <p className="text-sm text-slate-600 dark:text-slate-300">
                           Based on your current savings, you'll hit your goal by <span className="font-bold text-slate-900 dark:text-white">November 12th</span>.
                       </p>
                  </div>

                  <div className="h-24 flex items-end gap-2 px-2">
                        <div className="w-1/4 h-[40%] bg-slate-100 dark:bg-slate-800 rounded-t-lg" />
                        <div className="w-1/4 h-[60%] bg-slate-200 dark:bg-slate-700 rounded-t-lg" />
                        <div className="w-1/4 h-[80%] bg-slate-300 dark:bg-slate-600 rounded-t-lg" />
                        <div className="w-1/4 h-[100%] bg-slate-900 dark:bg-white rounded-t-lg relative group">
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-black text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                Goal
                            </div>
                        </div>
                  </div>
                  
                  <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                       <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-slate-500" />
                       </div>
                       <div className="text-xs text-slate-400">
                           AI Forecasting
                       </div>
                  </div>
            </div>
        </div>
    )
}
