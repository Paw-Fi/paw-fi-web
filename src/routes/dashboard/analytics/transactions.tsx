import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { format, parseISO, subDays } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Search, ArrowLeft, Trash2, Tag, SlidersHorizontal } from 'lucide-react'

export const Route = createFileRoute('/dashboard/analytics/transactions')({
  component: RouteComponent,
})

interface ContactRow { id: string; user_id: string | null; phone_e164: string; verified: boolean; preferred_currency: string | null }
interface ExpenseRow { id: string; contact_id: string; date: string; amount_cents: number; currency: string | null; category: string | null; created_at: string; raw_text?: string | null }

function cents(n: number | null | undefined) { return Math.round(Number(n || 0)) }
function money(centsValue: number, cur='USD') { 
  const sym: Record<string,string>={USD:'$',EUR:'€',GBP:'£',JPY:'¥',AUD:'A$',CAD:'C$',SGD:'S$',HKD:'HK$',INR:'₹'}
  return `${sym[cur.toUpperCase()]||'$'}${(centsValue/100).toFixed(2)}` 
}
function dstr(d: Date) { return format(d,'yyyy-MM-dd') }
function dayLabel(s: string) { return format(parseISO(s),'MMM d') }

// Generate consistent colors for categories
function getCategoryColor(category: string, index: number): string {
  const colors = [
    'hsl(var(--chart-primary))',      // Purple
    '#10B981',                          // Green (success)
    '#3B82F6',                          // Blue
    '#F59E0B',                          // Amber/Orange
    '#EF4444',                          // Red (danger)
    '#EC4899',                          // Pink
    '#8B5CF6',                          // Violet
    '#14B8A6',                          // Teal
    '#F97316',                          // Orange
    '#06B6D4',                          // Cyan
  ]
  
  // Use category name to generate consistent index
  const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

function RouteComponent() {
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc')
  const [editExpenseOpen, setEditExpenseOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null)
  const [editCategory, setEditCategory] = useState('')
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const today = dstr(new Date())
  const from = dstr(subDays(new Date(), 90)) // Last 90 days
  const to = today

  // Contact
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

  const contactId = contactQ.data?.id
  const currency = contactQ.data?.preferred_currency || 'USD'

  // Expenses
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

  // Categories
  const allCategories = useMemo(() => {
    const set = new Set<string>()
    for (const e of expensesQ.data || []) set.add((e.category || 'uncategorized').toLowerCase())
    return ['all', ...Array.from(set).sort()]
  }, [expensesQ.data])

  // Filtered and sorted expenses
  const processedExpenses = useMemo(() => {
    let filtered = expensesQ.data || []
    
    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(e => 
        (e.category || 'uncategorized').toLowerCase().includes(q) ||
        e.date.includes(q) ||
        money(cents(e.amount_cents), e.currency || currency).toLowerCase().includes(q) ||
        (e.raw_text || '').toLowerCase().includes(q)
      )
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(e => (e.category || 'uncategorized').toLowerCase() === categoryFilter)
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'date-desc') return b.date.localeCompare(a.date)
      if (sortBy === 'date-asc') return a.date.localeCompare(b.date)
      if (sortBy === 'amount-desc') return cents(b.amount_cents) - cents(a.amount_cents)
      if (sortBy === 'amount-asc') return cents(a.amount_cents) - cents(b.amount_cents)
      return 0
    })

    return sorted
  }, [expensesQ.data, searchQuery, categoryFilter, sortBy, currency])

  // Group by date
  const groupedExpenses = useMemo(() => {
    const byDate = new Map<string, ExpenseRow[]>()
    for (const exp of processedExpenses) {
      const arr = byDate.get(exp.date) || []
      arr.push(exp)
      byDate.set(exp.date, arr)
    }
    return Array.from(byDate.entries())
  }, [processedExpenses])

  // Stats
  const totalSpent = useMemo(() => {
    return processedExpenses.reduce((sum, e) => sum + cents(e.amount_cents), 0)
  }, [processedExpenses])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <p className="text-muted-foreground">Please sign in to view transactions.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-moneko-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard/analytics" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-light text-foreground">All Transactions</h1>
            <p className="text-muted-foreground">
              {processedExpenses.length} transaction{processedExpenses.length !== 1 ? 's' : ''} • Total: {money(totalSpent, currency)}
            </p>
          </div>
        </div>

        <Card className="rounded-3xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Transactions</CardTitle>
                <CardDescription>Search, filter, and manage your expenses</CardDescription>
              </div>
              <Dialog open={manageCategoriesOpen} onOpenChange={setManageCategoriesOpen}>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => setManageCategoriesOpen(true)}>
                  <Tag className="h-4 w-4 mr-1.5" />
                  Categories
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Manage Categories</DialogTitle>
                    <DialogDescription>Add or remove expense categories.</DialogDescription>
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
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="space-y-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map(cat => (
                      <SelectItem key={cat} value={cat} className="capitalize">{cat === 'all' ? 'All categories' : cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest first</SelectItem>
                    <SelectItem value="date-asc">Oldest first</SelectItem>
                    <SelectItem value="amount-desc">Highest amount</SelectItem>
                    <SelectItem value="amount-asc">Lowest amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Transactions list */}
            {!processedExpenses.length ? (
              <div className="py-12 text-center text-muted-foreground">
                {searchQuery || categoryFilter !== 'all' ? 'No transactions match your filters.' : 'No transactions yet.'}
              </div>
            ) : (
              <div className="space-y-6">
                {groupedExpenses.map(([date, expenses]) => {
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
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editExpenseOpen} onOpenChange={setEditExpenseOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
              <DialogDescription>View details, update category, or delete this expense.</DialogDescription>
            </DialogHeader>
            {editingExpense && (
              <div className="space-y-4 py-4">
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

                {editingExpense.raw_text && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Message</Label>
                    <div className="mt-1.5 p-3 rounded-lg bg-muted/50 border border-subtle-border">
                      <p className="text-sm whitespace-pre-wrap">{editingExpense.raw_text}</p>
                    </div>
                  </div>
                )}

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
      </div>
    </div>
  )
}
