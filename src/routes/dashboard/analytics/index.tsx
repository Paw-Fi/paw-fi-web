import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { addDays, eachDayOfInterval, format, parseISO, subDays, differenceInCalendarDays } from 'date-fns'

// shadcn/ui
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

// Recharts primitives used inside shadcn ChartContainer
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'
import { HelpCircle, Plus, Settings, Search, Filter, Edit2, Trash2, Tag, ArrowRight, Calendar, Info, ChevronLeft, ChevronRight, Wallet, Target, PiggyBank } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/analytics/')({
  component: RouteComponent,
})

interface ContactRow { id: string; user_id: string | null; phone_e164: string; verified: boolean; preferred_currency: string | null }
interface ExpenseRow { id: string; contact_id: string; date: string; amount_cents: number; currency: string | null; category: string | null; created_at: string; raw_text?: string | null }

// ---- Helpers ----
function exportCsvExpenses(rows: ExpenseRow[]) {
  const header = ['id','date','amount_cents','amount','currency','category','created_at']
  const lines = rows.map(r => {
    const amount = (cents(r.amount_cents)/100).toFixed(2)
    return [r.id, r.date, String(cents(r.amount_cents)), amount, (r.currency||'USD'), (r.category||'uncategorized'), r.created_at]
  })
  const csv = [header.join(','), ...lines.map(a=>a.map(v => String(v).replaceAll('"','""')).join(','))].join('\n')
  downloadCsv(csv, `expenses_${format(new Date(),'yyyyMMdd_HHmmss')}.csv`)
}

function exportCsvBudgets(rows: DailyBudgetRow[]) {
  const header = ['id','date','amount_cents','amount','currency']
  const lines = rows.map(r => {
    const amount = (cents(r.amount_cents)/100).toFixed(2)
    return [r.id, r.date, String(cents(r.amount_cents)), amount, (r.currency||'USD')]
  })
  const csv = [header.join(','), ...lines.map(a=>a.map(v => String(v).replaceAll('"','""')).join(','))].join('\n')
  downloadCsv(csv, `budgets_${format(new Date(),'yyyyMMdd_HHmmss')}.csv`)
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(()=>URL.revokeObjectURL(url), 1000)
}

// Evaluate whether projected running balance can cover an expense by a given date
function canAffordScenario(amountMajor: number, targetDateIso: string, projection: { day: string; projected_spent: number; projected_budget: number; projected_running: number }[], todayIso: string): boolean {
  const amountCents = Math.round((amountMajor || 0) * 100)
  const diff = differenceInCalendarDays(parseISO(targetDateIso), parseISO(todayIso))
  if (diff <= 0) return false
  if (!projection.length) return false
  // Index in projection is diff-1 (projection starts at +1 day)
  const idx = diff - 1
  if (idx < 0 || idx >= projection.length) return false
  const running = projection[idx].projected_running
  return running - amountCents >= 0
}
interface ExpenseRow { id: string; contact_id: string; date: string; amount_cents: number; currency: string | null; category: string | null; created_at: string }
interface DailyBudgetRow { id: string; contact_id: string; date: string; amount_cents: number; currency: string | null }
interface GoalRow {
  id: string
  title: string
  goal_type: string
  target_amount: number
  current_amount: number
  currency: string
  start_date: string
  target_date: string
  progress_percentage: number
  is_on_track: boolean
}

function cents(n: number | null | undefined) { return Math.round(Number(n || 0)) }
function sym(code?: string) {
  const m: Record<string,string>={USD:'$',EUR:'€',GBP:'£',JPY:'¥',AUD:'A$',CAD:'C$',SGD:'S$',HKD:'HK$',INR:'₹'}
  return m[(code||'USD').toUpperCase()]||'$'
}
function money(centsValue: number, cur='USD') { return `${sym(cur)}${(centsValue/100).toFixed(2)}` }
function dstr(d: Date) { return format(d,'yyyy-MM-dd') }
function dayLabel(s: string) { return format(parseISO(s),'MMM d') }

// Generate consistent colors for categories (works in light & dark mode)
function getCategoryColor(category: string, index: number): string {
  const colors = [
    '#7458FF',  // Purple (primary)
    '#10B981',  // Green (success)
    '#3B82F6',  // Blue
    '#F59E0B',  // Amber/Orange
    '#EF4444',  // Red (danger)
    '#EC4899',  // Pink
    '#8B5CF6',  // Violet
    '#14B8A6',  // Teal
    '#F97316',  // Orange
    '#06B6D4',  // Cyan
  ]
  
  // Use category name to generate consistent index
  const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}
function daysBetween(from: string, to: string) { return eachDayOfInterval({ start: parseISO(from), end: parseISO(to) }).map(dstr) }

function RouteComponent() {
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30)
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [scenarioAmount, setScenarioAmount] = useState<string>('')
  const [scenarioDate, setScenarioDate] = useState<string>('')
  const [envelopeMonth, setEnvelopeMonth] = useState<string>(format(new Date(), 'yyyy-MM'))
  
  // Envelope management state
  const [createEnvelopeOpen, setCreateEnvelopeOpen] = useState(false)
  const [newEnvelopeName, setNewEnvelopeName] = useState('')
  const [newEnvelopeTarget, setNewEnvelopeTarget] = useState('')
  const [allocEnvelopeOpen, setAllocEnvelopeOpen] = useState(false)
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState('')
  const [allocAmount, setAllocAmount] = useState('')
  const [linkCategoryOpen, setLinkCategoryOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  
  // Transaction/expense management state
  const [searchQuery, setSearchQuery] = useState('')
  const [editExpenseOpen, setEditExpenseOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null)
  const [editCategory, setEditCategory] = useState('')
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  
  // Budget management state
  const [setBudgetOpen, setSetBudgetOpen] = useState(false)
  const [budgetDate, setBudgetDate] = useState(dstr(new Date()))
  const [budgetAmount, setBudgetAmount] = useState('')
  
  // Envelope how it works modal
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [carouselStep, setCarouselStep] = useState(0)
  const today = dstr(new Date())
  const from = dstr(subDays(new Date(), rangeDays - 1))
  const to = today

  // Contact bound to this user via WhatsApp verification
  const contactQ = useQuery({
    queryKey: ['contactByUser', user?.id],
    enabled: !!user?.id && isAuthenticated,
    staleTime: 300_000,
    queryFn: async (): Promise<ContactRow | null> => {
      const { data, error } = await supabase
        .from('user_contacts')
        .select('id,user_id,phone_e164,verified,preferred_currency')
        .eq('user_id', user!.id)
        .eq('verified', true)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
  const contactId = contactQ.data?.id || null
  const currency = contactQ.data?.preferred_currency || 'USD'

  // realtime updates for collaboration-like instant sync
  useEffect(() => {
    if (!contactId) return
    const ch = supabase
      .channel('analytics-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `contact_id=eq.${contactId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['expenses', contactId] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_budgets', filter: `contact_id=eq.${contactId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['daily_budgets', contactId] })
      })
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch {} }
  }, [contactId, queryClient])

  // Expenses in range
  const expensesQ = useQuery({
    queryKey: ['expenses', contactId, from, to],
    enabled: !!contactId,
    staleTime: 60_000,
    queryFn: async (): Promise<ExpenseRow[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('id,contact_id,date,amount_cents,currency,category,created_at,raw_text')
        .eq('contact_id', contactId)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true })
      if (error) throw error
      return data || []
    },
  })

  // Daily budgets in range
  const budgetsQ = useQuery({
    queryKey: ['daily_budgets', contactId, from, to],
    enabled: !!contactId,
    staleTime: 60_000,
    queryFn: async (): Promise<DailyBudgetRow[]> => {
      const { data, error } = await supabase
        .from('daily_budgets')
        .select('id,contact_id,date,amount_cents,currency')
        .eq('contact_id', contactId)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true })
      if (error) throw error
      return data || []
    },
  })

  // Goals for the user (sinking funds / targets)
  const goalsQ = useQuery({
    queryKey: ['financial_goals', user?.id],
    enabled: !!user?.id && isAuthenticated,
    staleTime: 300_000,
    queryFn: async (): Promise<GoalRow[]> => {
      const { data, error } = await supabase
        .from('financial_goals')
        .select('id,title,goal_type,target_amount,current_amount,currency,start_date,target_date,progress_percentage,is_on_track')
        .eq('user_id', user!.id)
        .order('target_date', { ascending: true })
      if (error) throw error
      return (data || []).map((g: any) => ({
        ...g,
        target_amount: Number(g.target_amount),
        current_amount: Number(g.current_amount),
        progress_percentage: Number(g.progress_percentage),
      }))
    },
  })

  // Envelopes data (zero-based budgeting)
  const envelopesQ = useQuery({
    queryKey: ['budget_envelopes', contactId],
    enabled: !!contactId,
    staleTime: 60_000,
    queryFn: async (): Promise<{ id: string; name: string; monthly_target_cents: number }[]> => {
      const { data, error } = await supabase
        .from('budget_envelopes')
        .select('id,name,monthly_target_cents')
        .eq('contact_id', contactId)
        .order('name', { ascending: true })
      if (error) throw error
      return (data || []).map((e: any) => ({ id: e.id, name: e.name, monthly_target_cents: Number(e.monthly_target_cents)||0 }))
    },
  })

  const periodMonth = `${envelopeMonth}-01`

  const envAllocQ = useQuery({
    queryKey: ['envelope_allocations', contactId, envelopeMonth],
    enabled: !!contactId && !!envelopesQ.data?.length,
    staleTime: 60_000,
    queryFn: async (): Promise<{ envelope_id: string; amount_cents: number }[]> => {
      const envIds = (envelopesQ.data || []).map(e => e.id)
      if (!envIds.length) return []
      const { data, error } = await supabase
        .from('envelope_allocations')
        .select('envelope_id, amount_cents')
        .in('envelope_id', envIds)
        .eq('period_month', periodMonth)
      if (error) throw error
      return (data || []).map((r: any) => ({ envelope_id: r.envelope_id, amount_cents: Number(r.amount_cents)||0 }))
    },
  })

  const envSpendQ = useQuery({
    queryKey: ['v_envelope_monthly_spend', contactId, envelopeMonth],
    enabled: !!contactId && !!envelopesQ.data?.length,
    staleTime: 60_000,
    queryFn: async (): Promise<{ envelope_id: string; spent_cents: number }[]> => {
      const envIds = (envelopesQ.data || []).map(e => e.id)
      if (!envIds.length) return []
      const { data, error } = await supabase
        .from('v_envelope_monthly_spend')
        .select('envelope_id, spent_cents')
        .in('envelope_id', envIds)
        .eq('period_month', periodMonth)
      if (error) throw error
      return (data || []).map((r: any) => ({ envelope_id: r.envelope_id, spent_cents: Number(r.spent_cents)||0 }))
    },
  })

  const days = useMemo(() => daysBetween(from, to), [from, to])

  // category list from real data
  const allCategories = useMemo(() => {
    const set = new Set<string>()
    for (const e of expensesQ.data || []) set.add((e.category || 'uncategorized').toLowerCase())
    return ['all', ...Array.from(set).sort()]
  }, [expensesQ.data])

  // filter expenses by category
  const filteredExpenses = useMemo(() => {
    if (categoryFilter === 'all') return expensesQ.data || []
    return (expensesQ.data || []).filter(e => (e.category || 'uncategorized').toLowerCase() === categoryFilter)
  }, [expensesQ.data, categoryFilter])
  const expensesByDay = useMemo(() => {
    const m = new Map<string, number>()
    days.forEach(d => m.set(d, 0))
    for (const e of filteredExpenses || []) m.set(e.date, cents(m.get(e.date)) + cents(e.amount_cents))
    return m
  }, [days, filteredExpenses])
  const budgetByDay = useMemo(() => {
    const m = new Map<string, number>()
    days.forEach(d => m.set(d, 0))
    for (const b of budgetsQ.data || []) m.set(b.date, cents(m.get(b.date)) + cents(b.amount_cents))
    return m
  }, [days, budgetsQ.data])

  const series = useMemo(() => {
    let running = 0
    return days.map((d) => {
      const budget = cents(budgetByDay.get(d))
      const spent = cents(expensesByDay.get(d))
      running += budget - spent
      return { date: d, day: dayLabel(d), budget, spent, running }
    })
  }, [days, budgetByDay, expensesByDay])

  // one-off detection (outliers) within current filter
  const oneOffByDay = useMemo(() => {
    const arr = filteredExpenses.map(e => ({ date: e.date, amount: cents(e.amount_cents) }))
    if (!arr.length) return new Set<string>()
    const mean = arr.reduce((s, x) => s + x.amount, 0) / arr.length
    const threshold = mean * 2
    const set = new Set<string>()
    for (const e of arr) if (e.amount > threshold) set.add(e.date)
    return set
  }, [filteredExpenses])

  // aggregate by granularity
  const seriesAgg = useMemo(() => {
    if (granularity === 'day') {
      return series.map(s => ({ ...s, oneOff: oneOffByDay.has(s.date) ? s.spent : undefined }))
    }
    const buckets = new Map<string, { key: string; budget: number; spent: number; running?: number; anyOneOff: boolean }>()
    let running = 0
    for (const s of series) {
      const d = parseISO(s.date)
      const key = granularity === 'week' ? format(d, 'yyyy-ww') : format(d, 'yyyy-MM')
      const prev = buckets.get(key) || { key, budget: 0, spent: 0, anyOneOff: false }
      prev.budget += s.budget
      prev.spent += s.spent
      prev.anyOneOff = prev.anyOneOff || oneOffByDay.has(s.date)
      buckets.set(key, prev)
    }
    const ordered = Array.from(buckets.values()).sort((a,b)=>a.key.localeCompare(b.key)).map(b => {
      running += b.budget - b.spent
      return { day: b.key, budget: b.budget, spent: b.spent, running, oneOff: b.anyOneOff ? b.spent : undefined }
    })
    return ordered
  }, [series, granularity, oneOffByDay])

  // 30-day look-ahead based on trailing averages
  const projection = useMemo(() => {
    const lookback = 30
    const lbFrom = dstr(subDays(parseISO(to), lookback - 1))
    const lbDays = daysBetween(lbFrom, to)
    const spentTotal = lbDays.reduce((s, d) => s + cents(expensesByDay.get(d)), 0)
    const budgetTotal = lbDays.reduce((s, d) => s + cents(budgetByDay.get(d)), 0)
    const avgSpent = lbDays.length ? Math.round(spentTotal / lbDays.length) : 0
    const avgBudget = lbDays.length ? Math.round(budgetTotal / lbDays.length) : 0
    const start = series.length ? series[series.length - 1].running : 0
    let run = start
    const data = Array.from({ length: 30 }, (_, i) => {
      run += avgBudget - avgSpent
      return { day: format(addDays(parseISO(to), i + 1), 'MMM d'), projected_spent: avgSpent, projected_budget: avgBudget, projected_running: run }
    })
    return { avgSpent, avgBudget, data }
  }, [budgetByDay, expensesByDay, series, to])

  // long-term projection (18 months) using monthly averages from last 90 days
  const longTerm = useMemo(() => {
    const lookback = 90
    const lbFrom = dstr(subDays(parseISO(to), lookback - 1))
    const lbDays = daysBetween(lbFrom, to)
    const spentTotal = lbDays.reduce((s, d) => s + cents(expensesByDay.get(d)), 0)
    const budgetTotal = lbDays.reduce((s, d) => s + cents(budgetByDay.get(d)), 0)
    const avgDailySpent = lbDays.length ? spentTotal / lbDays.length : 0
    const avgDailyBudget = lbDays.length ? budgetTotal / lbDays.length : 0
    const avgMonthlySpent = Math.round(avgDailySpent * 30)
    const avgMonthlyBudget = Math.round(avgDailyBudget * 30)
    // Start from latest running
    let run = series.length ? series[series.length - 1].running : 0
    const months = Array.from({ length: 18 }, (_, i) => {
      run += avgMonthlyBudget - avgMonthlySpent
      const label = format(addDays(parseISO(to), (i+1)*30), 'MMM yyyy')
      return { month: label, budget: avgMonthlyBudget, spent: avgMonthlySpent, running: run }
    })
    return { avgMonthlySpent, avgMonthlyBudget, months }
  }, [budgetByDay, expensesByDay, series, to])

  // Category totals in range
  const categoryTotals = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of filteredExpenses || []) {
      const key = (e.category || 'uncategorized').toLowerCase()
      m.set(key, cents(m.get(key)) + cents(e.amount_cents))
    }
    const arr = Array.from(m.entries()).sort((a,b)=>b[1]-a[1])
    return arr.map(([name, value], index) => ({ 
      name, 
      value,
      fill: getCategoryColor(name, index)
    }))
  }, [filteredExpenses])

  // Envelope chart data
  const envelopesData = useMemo(() => {
    const list = envelopesQ.data || []
    const allocMap = new Map<string, number>()
    for (const a of envAllocQ.data || []) allocMap.set(a.envelope_id, a.amount_cents)
    const spentMap = new Map<string, number>()
    for (const s of envSpendQ.data || []) spentMap.set(s.envelope_id, s.spent_cents)
    return list.map((e, index) => {
      const alloc = allocMap.get(e.id) ?? e.monthly_target_cents
      const spent = spentMap.get(e.id) ?? 0
      const remaining = Math.max(alloc - spent, 0)
      const color = getCategoryColor(e.name, index)
      return { 
        name: e.name, 
        allocated: alloc, 
        spent, 
        remaining,
        fill: color
      }
    })
  }, [envelopesQ.data, envAllocQ.data, envSpendQ.data])

  const loading = contactQ.isLoading || expensesQ.isLoading || budgetsQ.isLoading
  const hasData = !!((expensesQ.data?.length || 0) + (budgetsQ.data?.length || 0))

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto px-0 sm:px-8 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="mt-4 text-muted-foreground">Please sign in to view your analytics.</p>
      </div>
    )
  }

  const timeseriesConfig: ChartConfig = {
    budget: { label: 'Budget', color: '#7458FF' },
    spent: { label: 'Spent', color: '#EF4444' },
    running: { label: 'Running', color: '#10B981' },
    oneOff: { label: 'One‑off', color: '#F59E0B' },
  }

  const categoryConfig: ChartConfig = {
    value: { label: 'Spent', color: '#7458FF' },
  }
  const envelopeChartConfig: ChartConfig = {
    allocated: { label: 'Allocated', color: '#7458FF' },
    spent: { label: 'Spent', color: '#EF4444' },
    remaining: { label: 'Remaining', color: '#10B981' },
  }

  return (
    <div className="min-h-screen bg-moneko-background">
      <div className="max-w-7xl mx-auto px-0 sm:px-8 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-light text-foreground">Analytics</h1>
            <p className="text-muted-foreground">Track spending, manage budgets, and view insights.</p>
          </div>
          <div className="flex items-center gap-2">
            <RangeButton current={rangeDays} value={7} onChange={setRangeDays} />
            <RangeButton current={rangeDays} value={30} onChange={setRangeDays} />
            <RangeButton current={rangeDays} value={90} onChange={setRangeDays} />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="envelopes">Envelopes</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
          </TabsList>

          {/* Overview Tab - Metrics + Transactions */}
          <TabsContent value="overview" className="space-y-6">


            {!contactId && !contactQ.isLoading && (
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg">Link WhatsApp</CardTitle>
              <CardDescription>No verified WhatsApp contact is linked to your account. Open Settings → WhatsApp to verify and start logging expenses.</CardDescription>
            </CardHeader>
          </Card>
        )}

            {/* Metrics with Budget button */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Quick Stats</h2>
              <Dialog open={setBudgetOpen} onOpenChange={setSetBudgetOpen}>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => setSetBudgetOpen(true)}>
                  <Calendar className="h-4 w-4 mr-1.5" />
                  Set Budget
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set Daily Budget</DialogTitle>
                    <DialogDescription>Set or update your budget for a specific date.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="budget-date">Date</Label>
                      <Input
                        id="budget-date"
                        type="date"
                        value={budgetDate}
                        onChange={(e) => setBudgetDate(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="budget-amount">Amount</Label>
                      <Input
                        id="budget-amount"
                        type="number"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={budgetAmount}
                        onChange={(e) => setBudgetAmount(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSetBudgetOpen(false)}>Cancel</Button>
                    <Button onClick={async () => {
                      if (!budgetAmount || !contactId) return
                      const amountCents = Math.round(parseFloat(budgetAmount) * 100)
                      const { error } = await supabase
                        .from('daily_budgets')
                        .upsert({ contact_id: contactId, date: budgetDate, amount_cents: amountCents, currency }, { onConflict: 'contact_id,date' })
                      if (!error) {
                        queryClient.invalidateQueries({ queryKey: ['budgets', contactId] })
                        setBudgetAmount('')
                        setSetBudgetOpen(false)
                      }
                    }}>Save Budget</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="Today Budget" value={money(cents(budgetByDay.get(today)), currency)} subtitle={today} loading={loading} tone="neutral" />
              <MetricCard title="Today Spent" value={money(cents(expensesByDay.get(today)), currency)} subtitle={today} loading={loading} tone="warning" />
              <MetricCard title="Today Remaining" value={money(Math.max(cents(budgetByDay.get(today)) - cents(expensesByDay.get(today)), 0), currency)} subtitle={today} loading={loading} tone="success" />
              <MetricCard title="Running Balance" value={money(series.length ? series[series.length - 1].running : 0, currency)} subtitle="Cumulative" loading={loading} tone="special" />
            </div>

            {/* Transactions - moved from separate tab */}
            <Card className="rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">Transactions</CardTitle>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>View and manage all your expenses. Edit categories, search transactions, and keep your spending organized.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Dialog open={manageCategoriesOpen} onOpenChange={setManageCategoriesOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="rounded-full">
                        <Tag className="h-4 w-4 mr-1.5" />
                        Categories
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Manage Categories</DialogTitle>
                        <DialogDescription>
                          Add or remove expense categories to organize your spending.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="new-category">Add New Category</Label>
                          <div className="flex gap-2 mt-1.5">
                            <Input
                              id="new-category"
                              placeholder="e.g., Entertainment, Healthcare"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                            />
                            <Button onClick={async () => {
                              if (!newCategoryName.trim() || !contactId) return
                              const { error } = await supabase
                                .from('expense_categories')
                                .insert({ contact_id: contactId, name: newCategoryName.trim().toLowerCase(), is_default: false })
                              if (!error) {
                                queryClient.invalidateQueries({ queryKey: ['expenses', contactId] })
                                setNewCategoryName('')
                              }
                            }}>Add</Button>
                          </div>
                        </div>
                        <div>
                          <Label>Existing Categories</Label>
                          <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto">
                            {allCategories.filter(c => c !== 'all').map(cat => (
                              <div key={cat} className="flex items-center justify-between p-2 rounded-lg bg-subtle-background">
                                <span className="text-sm capitalize">{cat}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => setManageCategoriesOpen(false)}>Done</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <CardDescription>Recent expenses. Click any to edit or recategorize.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {!expensesQ.data?.length ? (
                    <Empty message="No transactions in this range." />
                  ) : (
                    <div className="space-y-6">
                      {(() => {
                        const filtered = expensesQ.data.filter(e => {
                          if (!searchQuery) return true
                          const q = searchQuery.toLowerCase()
                          return (
                            (e.category || 'uncategorized').toLowerCase().includes(q) ||
                            e.date.includes(q) ||
                            money(cents(e.amount_cents), e.currency || currency).toLowerCase().includes(q)
                          )
                        })
                        const byDate = new Map<string, ExpenseRow[]>()
                        for (const exp of filtered) {
                          const arr = byDate.get(exp.date) || []
                          arr.push(exp)
                          byDate.set(exp.date, arr)
                        }
                        const sorted = Array.from(byDate.entries()).sort((a, b) => b[0].localeCompare(a[0]))
                        
                        return sorted.slice(0, 3).map(([date, expenses]) => {
                          const dayTotal = expenses.reduce((s, e) => s + cents(e.amount_cents), 0)
                          const isToday = date === today
                          const isYesterday = date === dstr(subDays(new Date(), 1))
                          const label = isToday ? 'Today' : isYesterday ? 'Yesterday' : dayLabel(date)
                          
                          return (
                            <div key={date}>
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium text-foreground">{label}</h3>
                                <span className="text-sm text-muted-foreground">{money(dayTotal, currency)}</span>
                              </div>
                              <div className="space-y-2">
                                {expenses.map(exp => (
                                  <div
                                    key={exp.id}
                                    className="flex items-center justify-between p-3 rounded-xl bg-card-bg border border-subtle-border hover:border-primary/50 transition-colors cursor-pointer"
                                    onClick={() => {
                                      setEditingExpense(exp)
                                      setEditCategory(exp.category || 'uncategorized')
                                      setEditExpenseOpen(true)
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div 
                                        className="w-10 h-10 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: getCategoryColor(exp.category || 'uncategorized', 0) + '20' }}
                                      >
                                        <span 
                                          className="text-sm font-medium uppercase"
                                          style={{ color: getCategoryColor(exp.category || 'uncategorized', 0) }}
                                        >
                                          {(exp.category || 'U')[0]}
                                        </span>
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium capitalize">{exp.category || 'Uncategorized'}</div>
                                        <div className="text-xs text-muted-foreground">{format(parseISO(exp.created_at), 'HH:mm')}</div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-medium">{money(cents(exp.amount_cents), exp.currency || currency)}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t border-subtle-border">
                  <Link 
                    to="/dashboard/analytics/transactions" 
                    className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                  >
                    View all transactions
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Charts Tab - All graphs and visualizations */}
          <TabsContent value="charts" className="space-y-6">
            {activeTab === 'charts' ? (
              <>
            {/* Compact controls */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Select value={granularity} onValueChange={(v) => setGranularity(v as any)}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allCategories.map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => exportCsvExpenses(filteredExpenses)}>
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Running & daily balances */}
            <Card className="rounded-3xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">Running & Daily Balances</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Shows your daily budget vs actual spending. The <strong>running balance</strong> is cumulative—it tracks how much you're ahead or behind over time.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <CardDescription>Budget vs Spent per day with cumulative running balance.</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasData ? (
              <Empty message="No budgets or expenses in this range yet." />
            ) : (
              <ChartContainer config={timeseriesConfig} className="aspect-[16/7]">
                <LineChart data={seriesAgg} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickMargin={8} />
                  <YAxis tickFormatter={(v) => money(v as number, currency)} width={80} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => <span className="font-mono">{money(v as number, currency)}</span>} />} />
                  <Line type="monotone" dataKey="budget" stroke="var(--color-budget)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="spent" stroke="var(--color-spent)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="running" stroke="var(--color-running)" dot={false} strokeWidth={2} />
                  {/* one-off points as dots only */}
                  <Line type="monotone" dataKey="oneOff" stroke="transparent" dot={{ r: 4, fill: 'hsl(var(--chart-danger))' }} activeDot={{ r: 5 }} />
                  <ChartLegend content={(props: any) => (
                    <ChartLegendContent payload={props.payload} verticalAlign={props.verticalAlign} />
                  )} />
                </LineChart>
              </ChartContainer>
            )}
              </CardContent>
            </Card>

            {/* 30‑day look‑ahead projection */}
            <Card className="rounded-3xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">30‑Day Look‑Ahead</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Forecasts the next 30 days based on your recent spending patterns. Helps you see if you'll stay on budget or need to adjust.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <CardDescription>Projected from trailing 30‑day averages.</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasData ? (
              <Empty message="Not enough history to project yet." />
            ) : (
              <ChartContainer config={timeseriesConfig} className="aspect-[16/7]">
                <AreaChart data={projection.data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickMargin={8} />
                  <YAxis tickFormatter={(v) => money(v as number, currency)} width={80} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => <span className="font-mono">{money(v as number, currency)}</span>} />} />
                  <Area type="monotone" dataKey="projected_budget" stroke="var(--color-budget)" fill="var(--color-budget)" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="projected_spent" stroke="var(--color-spent)" fill="var(--color-spent)" fillOpacity={0.15} />
                  <Line type="monotone" dataKey="projected_running" stroke="var(--color-running)" dot={false} strokeWidth={2} />
                  <ChartLegend content={(props: any) => (
                    <ChartLegendContent payload={props.payload} verticalAlign={props.verticalAlign} />
                  )} />
                </AreaChart>
              </ChartContainer>
            )}
              </CardContent>
            </Card>

            {/* Long-term 18‑month projection */}
            <Card className="rounded-3xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">Long‑Term Projection (18 months)</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Shows where your finances are headed over the next 18 months using your 90-day spending average. Great for planning big purchases or savings goals.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <CardDescription>Based on historical averages; updates automatically with your data.</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasData ? (
              <Empty message="Not enough history to project yet." />
            ) : (
              <ChartContainer config={timeseriesConfig} className="aspect-[16/7]">
                <AreaChart data={longTerm.months} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickMargin={8} />
                  <YAxis tickFormatter={(v) => money(v as number, currency)} width={80} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => <span className="font-mono">{money(v as number, currency)}</span>} />} />
                  <Area type="monotone" dataKey="budget" stroke="var(--color-budget)" fill="var(--color-budget)" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="spent" stroke="var(--color-spent)" fill="var(--color-spent)" fillOpacity={0.15} />
                  <Line type="monotone" dataKey="running" stroke="var(--color-running)" dot={false} strokeWidth={2} />
                  <ChartLegend content={(props: any) => (
                    <ChartLegendContent payload={props.payload} verticalAlign={props.verticalAlign} />
                  )} />
                </AreaChart>
              </ChartContainer>
            )}
              </CardContent>
            </Card>

            {/* Scenario planning */}
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-xl">Scenario Planning</CardTitle>
                <CardDescription>Test if you can afford a future expense based on projections.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  <Input type="number" inputMode="decimal" placeholder="Amount" value={scenarioAmount} onChange={(e) => setScenarioAmount(e.target.value)} className="w-[120px]" />
                  <Input type="date" value={scenarioDate} onChange={(e) => setScenarioDate(e.target.value)} className="w-[150px]" />
                  <Button size="sm" className="rounded-full" onClick={(e)=>e.preventDefault()}>Check</Button>
                  {scenarioAmount && scenarioDate && (
                    <span className="text-sm text-muted-foreground">
                      {canAffordScenario(Number(scenarioAmount), scenarioDate, projection.data, to) ? '✓ Affordable' : '✗ Not affordable'}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Category breakdown */}
            <Card className="rounded-3xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">Where the Money Went</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Breaks down your spending by category (groceries, transport, etc.) for the selected time range. Helps you spot where most of your money goes.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <CardDescription>Category totals for the selected range.</CardDescription>
              </CardHeader>
              <CardContent>
                {!expensesQ.data?.length ? (
                  <Empty message="No expenses in this range." />
                ) : (
                  <ChartContainer config={categoryConfig} className="aspect-[16/7]">
                    <BarChart data={categoryTotals} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickMargin={8} interval={0} angle={-15} height={50} />
                      <YAxis tickFormatter={(v) => money(v as number, currency)} width={80} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(v) => <span className="font-mono">{money(v as number, currency)}</span>} />} />
                      <Bar dataKey="value" />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
              </>
            ) : (
              <div className="space-y-6">
                <div className="h-8 bg-subtle-background animate-pulse rounded" />
                <div className="h-96 bg-subtle-background animate-pulse rounded-3xl" />
                <div className="h-96 bg-subtle-background animate-pulse rounded-3xl" />
              </div>
            )}
          </TabsContent>

          {/* Transactions Tab - Removed, moved to Overview */}

          {/* Envelopes Tab - Envelope-by-envelope breakdown */}
          <TabsContent value="envelopes" className="space-y-6">
            {/* Header with controls */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-light">Envelope Budgeting</h2>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-primary hover:underline p-0 h-auto underline font-bold"
                    onClick={() => {
                      setHowItWorksOpen(true)
                      setCarouselStep(0)
                    }}
                  >
                    How it works
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">Allocate funds to specific envelopes and track spending per category</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground">Month:</div>
                <Input type="month" value={envelopeMonth} onChange={(e)=>setEnvelopeMonth(e.target.value)} className="w-[160px]" />
              </div>
            </div>

            {!envelopesQ.data?.length ? (
              <Card className="rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-xl">Get Started with Envelopes</CardTitle>
                  <CardDescription>Create envelopes to allocate your budget across different spending categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="py-8">
                    <Empty message="No envelopes yet. Create your first envelope to start zero-based budgeting." />
                    <div className="flex justify-center mt-4">
                      <Dialog open={createEnvelopeOpen} onOpenChange={setCreateEnvelopeOpen}>
                        <DialogTrigger asChild>
                          <Button className="rounded-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Envelope
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create Envelope</DialogTitle>
                            <DialogDescription>
                              Create a new budget envelope to allocate funds for specific purposes (groceries, rent, entertainment, etc.)
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label htmlFor="envelope-name">Envelope Name</Label>
                              <Input
                                id="envelope-name"
                                placeholder="e.g., Groceries, Rent, Fun Money"
                                value={newEnvelopeName}
                                onChange={(e) => setNewEnvelopeName(e.target.value)}
                                className="mt-1.5"
                              />
                            </div>
                            <div>
                              <Label htmlFor="monthly-target">Monthly Target (optional)</Label>
                              <Input
                                id="monthly-target"
                                type="number"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={newEnvelopeTarget}
                                onChange={(e) => setNewEnvelopeTarget(e.target.value)}
                                className="mt-1.5"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateEnvelopeOpen(false)}>Cancel</Button>
                            <Button onClick={async () => {
                              if (!newEnvelopeName.trim() || !contactId) return
                              const targetCents = newEnvelopeTarget ? Math.round(parseFloat(newEnvelopeTarget) * 100) : 0
                              const { error } = await supabase
                                .from('budget_envelopes')
                                .upsert({ contact_id: contactId, name: newEnvelopeName.trim(), monthly_target_cents: targetCents, updated_at: new Date().toISOString() }, { onConflict: 'contact_id,name' })
                              if (!error) {
                                queryClient.invalidateQueries({ queryKey: ['budget_envelopes', contactId] })
                                setNewEnvelopeName('')
                                setNewEnvelopeTarget('')
                                setCreateEnvelopeOpen(false)
                              }
                            }}>Create</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-muted-foreground">Month</div>
                    <Input type="month" value={envelopeMonth} onChange={(e)=>setEnvelopeMonth(e.target.value)} className="w-[160px]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog open={createEnvelopeOpen} onOpenChange={setCreateEnvelopeOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="rounded-full">
                          <Plus className="h-4 w-4 mr-1.5" />
                          New Envelope
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Envelope</DialogTitle>
                          <DialogDescription>
                            Create a new budget envelope to allocate funds for specific purposes.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="envelope-name-2">Envelope Name</Label>
                            <Input
                              id="envelope-name-2"
                              placeholder="e.g., Groceries, Rent, Fun Money"
                              value={newEnvelopeName}
                              onChange={(e) => setNewEnvelopeName(e.target.value)}
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label htmlFor="monthly-target-2">Monthly Target (optional)</Label>
                            <Input
                              id="monthly-target-2"
                              type="number"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={newEnvelopeTarget}
                              onChange={(e) => setNewEnvelopeTarget(e.target.value)}
                              className="mt-1.5"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setCreateEnvelopeOpen(false)}>Cancel</Button>
                          <Button onClick={async () => {
                            if (!newEnvelopeName.trim() || !contactId) return
                            const targetCents = newEnvelopeTarget ? Math.round(parseFloat(newEnvelopeTarget) * 100) : 0
                            const { error } = await supabase
                              .from('budget_envelopes')
                              .upsert({ contact_id: contactId, name: newEnvelopeName.trim(), monthly_target_cents: targetCents, updated_at: new Date().toISOString() }, { onConflict: 'contact_id,name' })
                            if (!error) {
                              queryClient.invalidateQueries({ queryKey: ['budget_envelopes', contactId] })
                              setNewEnvelopeName('')
                              setNewEnvelopeTarget('')
                              setCreateEnvelopeOpen(false)
                            }
                          }}>Create</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={allocEnvelopeOpen} onOpenChange={setAllocEnvelopeOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="rounded-full">
                          <Settings className="h-4 w-4 mr-1.5" />
                          Set Allocation
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Set Monthly Allocation</DialogTitle>
                          <DialogDescription>
                            Allocate a specific amount to an envelope for {envelopeMonth}.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="select-envelope">Envelope</Label>
                            <Select value={selectedEnvelopeId} onValueChange={setSelectedEnvelopeId}>
                              <SelectTrigger className="mt-1.5">
                                <SelectValue placeholder="Select envelope" />
                              </SelectTrigger>
                              <SelectContent>
                                {envelopesQ.data?.map(env => (
                                  <SelectItem key={env.id} value={env.id}>{env.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="alloc-amount">Amount</Label>
                            <Input
                              id="alloc-amount"
                              type="number"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={allocAmount}
                              onChange={(e) => setAllocAmount(e.target.value)}
                              className="mt-1.5"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setAllocEnvelopeOpen(false)}>Cancel</Button>
                          <Button onClick={async () => {
                            if (!selectedEnvelopeId || !allocAmount || !contactId) return
                            const amountCents = Math.round(parseFloat(allocAmount) * 100)
                            const { error } = await supabase
                              .from('envelope_allocations')
                              .upsert({ envelope_id: selectedEnvelopeId, period_month: periodMonth, amount_cents: amountCents, updated_at: new Date().toISOString() }, { onConflict: 'envelope_id,period_month' })
                            if (!error) {
                              queryClient.invalidateQueries({ queryKey: ['envelope_allocations', contactId, envelopeMonth] })
                              setSelectedEnvelopeId('')
                              setAllocAmount('')
                              setAllocEnvelopeOpen(false)
                            }
                          }}>Save Allocation</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={linkCategoryOpen} onOpenChange={setLinkCategoryOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="rounded-full">
                          Link Category
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Link Category to Envelope</DialogTitle>
                          <DialogDescription>
                            Map expense categories to envelopes so spending is automatically tracked.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="select-envelope-link">Envelope</Label>
                            <Select value={selectedEnvelopeId} onValueChange={setSelectedEnvelopeId}>
                              <SelectTrigger className="mt-1.5">
                                <SelectValue placeholder="Select envelope" />
                              </SelectTrigger>
                              <SelectContent>
                                {envelopesQ.data?.map(env => (
                                  <SelectItem key={env.id} value={env.id}>{env.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="select-category">Category</Label>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                              <SelectTrigger className="mt-1.5">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {allCategories.filter(c => c !== 'all').map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setLinkCategoryOpen(false)}>Cancel</Button>
                          <Button onClick={async () => {
                            if (!selectedEnvelopeId || !selectedCategory || !contactId) return
                            const { error } = await supabase
                              .from('envelope_category_links')
                              .upsert({ envelope_id: selectedEnvelopeId, category: selectedCategory.toLowerCase(), updated_at: new Date().toISOString() }, { onConflict: 'envelope_id,category' })
                            if (!error) {
                              queryClient.invalidateQueries({ queryKey: ['v_envelope_monthly_spend', contactId, envelopeMonth] })
                              setSelectedEnvelopeId('')
                              setSelectedCategory('')
                              setLinkCategoryOpen(false)
                            }
                          }}>Link</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <ChartContainer config={envelopeChartConfig} className="aspect-[16/7]">
                  <BarChart data={envelopesData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickMargin={8} interval={0} angle={-12} height={48} />
                    <YAxis tickFormatter={(v) => money(v as number, currency)} width={80} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => <span className="font-mono">{money(v as number, currency)}</span>} />} />
                    <Bar dataKey="allocated" fill="var(--color-allocated)" />
                    <Bar dataKey="spent" fill="var(--color-spent)" />
                    <Bar dataKey="remaining" fill="var(--color-remaining)" />
                    <ChartLegend content={(props: any) => (
                      <ChartLegendContent payload={props.payload} verticalAlign={props.verticalAlign} />
                    )} />
                  </BarChart>
                </ChartContainer>
              </>
            )}
          </TabsContent>

          {/* Envelopes Tab */}
          <TabsContent value="envelopes" className="space-y-6">
            <div className="text-center py-12 text-muted-foreground">
              <p>Envelope management - coming soon</p>
            </div>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <Card className="rounded-3xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">Goals & Sinking Funds</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p><strong>Sinking funds</strong> are savings goals for future expenses (vacation, car repair, holiday gifts). Track your progress and see if you're on pace to hit your target by the deadline.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <CardDescription>Progress and target dates for your financial goals.</CardDescription>
              </CardHeader>
              <CardContent>
                {!goalsQ.data?.length ? (
                  <Empty message="No goals yet. Create goals to track progress over time." />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {goalsQ.data.map((g) => (
                      <div key={g.id} className="bg-card-bg rounded-2xl p-6 border border-subtle-border shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-muted-foreground">{g.goal_type}</div>
                            <div className="text-base font-medium text-foreground">{g.title}</div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${g.is_on_track ? 'bg-green-50/50 dark:bg-green-950/30 text-green-700 dark:text-green-300' : 'bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'}`}>{g.is_on_track ? 'On Track' : 'Needs Attention'}</span>
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{money(Math.round(g.current_amount * 100), g.currency)}</span>
                            <span>{money(Math.round(g.target_amount * 100), g.currency)}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-subtle-background overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, g.progress_percentage))}%` }} />
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">Target: {format(parseISO(g.target_date), 'MMM d, yyyy')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Expense Dialog - Outside tabs so it's always available */}
        <Dialog open={editExpenseOpen} onOpenChange={setEditExpenseOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
              <DialogDescription>
                View details, update category, or delete this expense.
              </DialogDescription>
            </DialogHeader>
            {editingExpense && (
              <div className="space-y-4 py-4">
                {/* Main info card */}
                <div className="p-4 rounded-lg bg-subtle-background space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span className="text-2xl font-medium">{money(cents(editingExpense.amount_cents), editingExpense.currency || currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Date</span>
                    <span className="text-sm font-medium">{format(parseISO(editingExpense.date), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Time</span>
                    <span className="text-sm">{format(parseISO(editingExpense.created_at), 'HH:mm:ss')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Currency</span>
                    <span className="text-sm">{editingExpense.currency || 'USD'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Transaction ID</span>
                    <span className="text-xs font-mono text-muted-foreground">{editingExpense.id.slice(0, 8)}...</span>
                  </div>
                </div>

                {/* Raw text from WhatsApp */}
                {editingExpense.raw_text && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Message</Label>
                    <div className="mt-1.5 p-3 rounded-lg bg-muted/50 border border-subtle-border">
                      <p className="text-sm whitespace-pre-wrap">{editingExpense.raw_text}</p>
                    </div>
                  </div>
                )}

                {/* Category selector */}
                <div>
                  <Label htmlFor="edit-category">Category</Label>
                  <Select value={editCategory} onValueChange={setEditCategory}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories.filter(c => c !== 'all').map(cat => (
                        <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter className="flex justify-between">
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (!editingExpense || !contactId) return
                  const { error } = await supabase
                    .from('expenses')
                    .delete()
                    .eq('id', editingExpense.id)
                  if (!error) {
                    queryClient.invalidateQueries({ queryKey: ['expenses', contactId] })
                    setEditExpenseOpen(false)
                    setEditingExpense(null)
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditExpenseOpen(false)}>Cancel</Button>
                <Button onClick={async () => {
                  if (!editingExpense || !contactId) return
                  const { error } = await supabase
                    .from('expenses')
                    .update({ category: editCategory.toLowerCase() })
                    .eq('id', editingExpense.id)
                  if (!error) {
                    queryClient.invalidateQueries({ queryKey: ['expenses', contactId] })
                    setEditExpenseOpen(false)
                    setEditingExpense(null)
                  }
                }}>Save Changes</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* How Envelope Budgeting Works Modal */}
        <Dialog open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>How Envelope Budgeting Works</DialogTitle>
              <DialogDescription>
                Learn how to take control of your spending with envelope budgeting
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6">
              {/* Carousel Step Indicator */}
              <div className="flex justify-center gap-2 mb-6">
                {[0, 1, 2, 3].map((step) => (
                  <button
                    key={step}
                    onClick={() => setCarouselStep(step)}
                    className={`h-2 rounded-full transition-all ${
                      step === carouselStep ? 'w-8 bg-primary' : 'w-2 bg-muted'
                    }`}
                  />
                ))}
              </div>

              {/* Carousel Content */}
              <div className="min-h-[300px]">
                {carouselStep === 0 && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wallet className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-center">What is Envelope Budgeting?</h3>
                    <p className="text-muted-foreground text-center">
                      Envelope budgeting is a proactive method where you allocate your income into specific "envelopes" 
                      (categories) at the start of each month, giving every dollar a job before you spend it.
                    </p>
                    <div className="bg-subtle-background p-4 rounded-lg mt-4">
                      <p className="text-sm"><strong>Traditional Budgeting:</strong> Set limits and track after spending</p>
                      <p className="text-sm mt-2"><strong>Envelope Budgeting:</strong> Allocate money first, then spend from envelopes</p>
                    </div>
                  </div>
                )}

                {carouselStep === 1 && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <h3 className="text-xl font-semibold text-center mb-6">Real-World Example</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Without Envelopes */}
                      <div className="relative">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                          <span className="px-3 py-1 rounded-full bg-muted text-xs font-medium">Without Envelopes</span>
                        </div>
                        <div className="p-5 rounded-xl border-2 border-muted bg-muted/20 space-y-4 pt-6">
                          <div className="space-y-3">
                            <div className="p-3 rounded-lg bg-card-bg border border-subtle-border">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Monthly income</span>
                                <span className="text-sm font-semibold">$3,000</span>
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-card-bg border border-subtle-border">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Daily budget</span>
                                <span className="text-sm font-semibold">$100</span>
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-warning-light dark:bg-warning/10 border border-warning/30">
                              <p className="text-sm text-muted-foreground italic">
                                You spend freely and hope you stay under $100/day
                              </p>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-muted">
                            <p className="text-xs text-center text-muted-foreground">No clear visibility on where money goes</p>
                          </div>
                        </div>
                      </div>

                      {/* With Envelopes */}
                      <div className="relative">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                          <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">With Envelopes</span>
                        </div>
                        <div className="p-5 rounded-xl border-2 border-primary bg-primary/5 space-y-4 pt-6">
                          <div className="space-y-2">
                            <div className="p-2 rounded-lg bg-card-bg border border-subtle-border">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Monthly income</span>
                                <span className="text-sm font-semibold">$3,000</span>
                              </div>
                            </div>
                            <p className="text-xs font-semibold text-muted-foreground px-2">Allocations:</p>
                            <div className="space-y-1.5 pl-3 border-l-2 border-primary/30">
                              <div className="flex items-center justify-between p-1.5 rounded bg-subtle-background">
                                <span className="text-xs">Rent</span>
                                <span className="text-xs font-medium">$1,000</span>
                              </div>
                              <div className="flex items-center justify-between p-1.5 rounded bg-subtle-background">
                                <span className="text-xs">Groceries</span>
                                <span className="text-xs font-medium">$600</span>
                              </div>
                              <div className="flex items-center justify-between p-1.5 rounded bg-subtle-background">
                                <span className="text-xs">Transportation</span>
                                <span className="text-xs font-medium">$300</span>
                              </div>
                              <div className="flex items-center justify-between p-1.5 rounded bg-subtle-background">
                                <span className="text-xs">Entertainment</span>
                                <span className="text-xs font-medium">$200</span>
                              </div>
                              <div className="flex items-center justify-between p-1.5 rounded bg-subtle-background">
                                <span className="text-xs">Savings</span>
                                <span className="text-xs font-medium">$500</span>
                              </div>
                              <div className="flex items-center justify-between p-1.5 rounded bg-subtle-background">
                                <span className="text-xs">Emergency</span>
                                <span className="text-xs font-medium">$400</span>
                              </div>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-primary/20">
                            <p className="text-xs text-center text-primary font-medium">Every dollar has a specific job</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Example Scenario */}
                    <div className="mt-6 p-4 rounded-lg bg-success-light dark:bg-success/10 border border-success/30">
                      <p className="text-sm font-semibold text-success mb-3">Now when you want to buy something:</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground">•</span>
                          <p className="text-muted-foreground">"Can I afford this $80 dinner?"</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground">•</span>
                          <p className="text-muted-foreground">Check Entertainment envelope: <strong className="text-success">$150 left → Yes!</strong></p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground">•</span>
                          <p className="text-muted-foreground">After purchase: <strong className="text-foreground">$70 left in Entertainment</strong></p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {carouselStep === 2 && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
                        <PiggyBank className="h-8 w-8 text-warning" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-center">Key Benefits</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-success-light dark:bg-success/10 border border-success/20">
                        <p className="font-medium text-success">✓ Intentional Spending</p>
                        <p className="text-sm text-muted-foreground mt-1">Decide priorities upfront instead of reacting after spending</p>
                      </div>
                      <div className="p-4 rounded-lg bg-success-light dark:bg-success/10 border border-success/20">
                        <p className="font-medium text-success">✓ Prevent Overspending</p>
                        <p className="text-sm text-muted-foreground mt-1">Visual reminder of limits before you make purchases</p>
                      </div>
                      <div className="p-4 rounded-lg bg-success-light dark:bg-success/10 border border-success/20">
                        <p className="font-medium text-success">✓ Category Visibility</p>
                        <p className="text-sm text-muted-foreground mt-1">See exactly where your money goes each month</p>
                      </div>
                      <div className="p-4 rounded-lg bg-success-light dark:bg-success/10 border border-success/20">
                        <p className="font-medium text-success">✓ Savings Goals</p>
                        <p className="text-sm text-muted-foreground mt-1">Create sinking funds for future expenses (vacation, car repair)</p>
                      </div>
                    </div>
                  </div>
                )}

                {carouselStep === 3 && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Target className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-center">Example: Monthly Budget</h3>
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-card-bg border border-subtle-border">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">💰 Monthly Income</p>
                            <p className="text-sm text-muted-foreground">Your total income for the month</p>
                          </div>
                          <span className="text-lg font-semibold">$3,000</span>
                        </div>
                      </div>
                      <div className="space-y-2 pl-4 border-l-2 border-primary">
                        <div className="flex items-center justify-between p-2 rounded bg-subtle-background">
                          <span className="text-sm">🏠 Rent</span>
                          <span className="text-sm font-medium">$1,000</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-subtle-background">
                          <span className="text-sm">🛒 Groceries</span>
                          <span className="text-sm font-medium">$600</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-subtle-background">
                          <span className="text-sm">🚗 Transportation</span>
                          <span className="text-sm font-medium">$300</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-subtle-background">
                          <span className="text-sm">🎉 Entertainment</span>
                          <span className="text-sm font-medium">$200</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-subtle-background">
                          <span className="text-sm">💾 Savings</span>
                          <span className="text-sm font-medium">$500</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-subtle-background">
                          <span className="text-sm">🚨 Emergency Fund</span>
                          <span className="text-sm font-medium">$400</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground text-center mt-4">
                        Every dollar has a job! When you want to spend $80 on dinner, check your Entertainment envelope first.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCarouselStep(Math.max(0, carouselStep - 1))}
                  disabled={carouselStep === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCarouselStep(Math.min(3, carouselStep + 1))}
                  disabled={carouselStep === 3}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setHowItWorksOpen(false)}>Got it!</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

function RangeButton({ current, value, onChange }: { current: number; value: 7 | 30 | 90; onChange: (v: 7 | 30 | 90) => void }) {
  const selected = current === value
  return (
    <Button variant={selected ? 'default' : 'outline'} size="sm" className="rounded-full" onClick={() => onChange(value)}>
      {value}d
    </Button>
  )
}

function Empty({ message }: { message: string }) {
  return <div className="py-8 text-sm text-muted-foreground">{message}</div>
}

function MetricCard({ title, value, subtitle, loading, tone }: { title: string; value: string; subtitle?: string; loading: boolean; tone: 'success' | 'warning' | 'neutral' | 'special' }) {
  const toneClass = tone === 'success'
    ? 'bg-green-50/50 dark:bg-green-950/30'
    : tone === 'warning'
    ? 'bg-amber-50/50 dark:bg-amber-950/30'
    : tone === 'special'
    ? 'bg-purple-50/50 dark:bg-purple-950/30'
    : 'bg-subtle-background'
  return (
    <div className={`rounded-2xl p-6 ${toneClass} border border-subtle-border shadow-sm`}> 
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-2 text-3xl font-light tracking-tight">{loading ? '…' : value}</div>
      {subtitle ? <div className="text-xs text-muted-foreground mt-1">{subtitle}</div> : null}
    </div>
  )
}
