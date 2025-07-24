import { DailyBriefing } from '@/components/dashboard/DailyBriefing'
import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'

export const Route = createFileRoute('/dashboard/daily-challenges/')({
  component: RouteComponent,
})

function RouteComponent() {
  return   <motion.section 
    className="px-4 py-8 sm:px-6 lg:px-8"
  >
    <div className="mx-auto max-w-7xl">
      <DailyBriefing         
      />
    </div>
  </motion.section>
}
