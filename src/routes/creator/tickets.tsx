import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import {
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Paperclip,
  MoreHorizontal,
  MessageSquare,
  ArrowUpDown,
  ChevronDown,
  User,
  MonitorSmartphone,
  Code2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import type { Database } from "@/types/database.types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

export const Route = createFileRoute("/creator/tickets")({
  component: TicketsDashboard,
});

function TicketsDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();

  const creatorAccessQuery = useQuery({
    queryKey: ["creator-access", user?.id],
    queryFn: async () => fetchCreatorAccess(user!.id),
    enabled: !isAuthLoading && !!user,
    staleTime: 60_000,
    retry: false,
  });

  const ticketsQuery = useQuery({
    queryKey: ["support-tickets"],
    queryFn: fetchSupportTickets,
    staleTime: 30_000,
    enabled: creatorAccessQuery.data?.is_creator === true,
  });

  const updateStatusMutation = useMutation({
    mutationFn: updateTicketStatus,
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["support-tickets"] });

      const previousTickets = queryClient.getQueryData<SupportTicketWithUser[]>(
        ["support-tickets"],
      );

      queryClient.setQueryData<SupportTicketWithUser[]>(
        ["support-tickets"],
        (currentTickets) =>
          currentTickets?.map((ticket) =>
            ticket.id === id
              ? {
                  ...ticket,
                  status,
                  is_resolved: isResolvedStatus(status),
                  resolved_at: isResolvedStatus(status)
                    ? new Date().toISOString()
                    : null,
                }
              : ticket,
          ) ?? [],
      );

      return { previousTickets };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTickets) {
        queryClient.setQueryData(["support-tickets"], context.previousTickets);
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] }),
  });

  const tickets = useMemo(() => ticketsQuery.data ?? [], [ticketsQuery.data]);
  const statusStats = useMemo(() => buildStatusStats(tickets), [tickets]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      void navigate({
        to: "/login",
        search: {
          redirect: window.location.href,
        },
        replace: true,
      });
    }
  }, [isAuthLoading, navigate, user]);

  useEffect(() => {
    if (!user || creatorAccessQuery.isLoading) {
      return;
    }

    if (creatorAccessQuery.error) {
      void navigate({
        to: "/dashboard",
        search: { notice: "creator_access_error" },
        replace: true,
      });
      return;
    }

    if (creatorAccessQuery.data?.is_creator === false) {
      void navigate({
        to: "/dashboard",
        search: { notice: "creator_only" },
        replace: true,
      });
    }
  }, [
    creatorAccessQuery.data,
    creatorAccessQuery.error,
    creatorAccessQuery.isLoading,
    navigate,
    user,
  ]);

  if (isAuthLoading || (!user && !creatorAccessQuery.data)) {
    return <TicketsPageState message="Checking your session..." />;
  }

  if (creatorAccessQuery.isLoading || creatorAccessQuery.isPending) {
    return <TicketsPageState message="Verifying creator access..." />;
  }

  if (!creatorAccessQuery.data?.is_creator) {
    return <TicketsPageState message="Redirecting..." />;
  }

  return (
    <div className="min-h-screen bg-slate-950 py-10 text-white">
      <div className="mx-auto w-full max-w-7xl space-y-8 px-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-primary/70 text-sm tracking-[0.3em] uppercase">
              Creator Console
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Support Tickets
            </h1>
            <p className="text-sm text-slate-300">
              Manage and resolve user support requests efficiently.
            </p>
          </div>
          <Button
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10 gap-2 bg-transparent"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["support-tickets"] })
            }
            disabled={ticketsQuery.isLoading || updateStatusMutation.isPending}
          >
            <RefreshCw
              className={`h-4 w-4 ${ticketsQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </header>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statusCards.map((card) => (
            <Card key={card.key} className={card.className}>
              <CardHeader className="px-5 py-4">
                <CardDescription className="text-xs tracking-[0.3em] text-white/60 uppercase">
                  {card.label}
                </CardDescription>
                <CardTitle className="text-3xl text-white">
                  {statusStats[card.key] ?? 0}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </section>

        <TicketDataTable
          data={tickets}
          isLoading={ticketsQuery.isLoading}
          updatingTicketId={
            updateStatusMutation.isPending
              ? (updateStatusMutation.variables?.id ?? null)
              : null
          }
          onStatusChange={(id, status) =>
            updateStatusMutation.mutate({ id, status })
          }
        />
      </div>
    </div>
  );
}

function TicketsPageState({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="text-sm text-slate-300">{message}</div>
    </div>
  );
}

function TicketDataTable({
  data,
  isLoading,
  updatingTicketId,
  onStatusChange,
}: {
  data: SupportTicketWithUser[];
  isLoading: boolean;
  updatingTicketId: string | null;
  onStatusChange: (id: string, status: SupportTicket["status"]) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const [selectedTicket, setSelectedTicket] =
    useState<SupportTicketWithUser | null>(null);

  useEffect(() => {
    if (!selectedTicket) {
      return;
    }

    const nextSelectedTicket = data.find(
      (ticket) => ticket.id === selectedTicket.id,
    );

    if (!nextSelectedTicket) {
      setSelectedTicket(null);
      return;
    }

    setSelectedTicket(nextSelectedTicket);
  }, [data, selectedTicket]);

  const columns: ColumnDef<SupportTicketWithUser>[] = [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as SupportTicket["type"];
        return (
          <Badge variant="secondary" className={typeBadgeClassName[type] || ""}>
            {type.replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "message",
      header: "Message & User",
      cell: ({ row }) => {
        const ticket = row.original;
        const hasAttachments =
          ticket.attachments && ticket.attachments.length > 0;
        return (
          <div className="max-w-[300px] lg:max-w-[500px]">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-white/90">
                {ticket.message}
              </span>
              {hasAttachments && (
                <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-white/40" />
              )}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-white/50">
              <span>{ticket.users?.full_name || "Anonymous"}</span>
              {ticket.users?.email && <span>· {ticket.users.email}</span>}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as SupportTicket["status"];
        const ticket = row.original;
        const isUpdatingTicket = updatingTicketId === ticket.id;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={status}
              disabled={isUpdatingTicket}
              onValueChange={(val: SupportTicket["status"]) =>
                onStatusChange(ticket.id, val)
              }
            >
              <SelectTrigger
                className={`h-8 w-[140px] border-0 text-xs font-medium ${statusBadgeClassName[status]} ${isUpdatingTicket ? "cursor-not-allowed opacity-70" : ""}`}
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-slate-900 text-white">
                {statusOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-xs"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        if (value === "all") return true;
        return row.getValue(id) === value;
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4 text-white/70 hover:bg-white/5 hover:text-white"
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"));
        return (
          <div className="flex flex-col text-sm text-white/70">
            <span>{formatDistanceToNow(date, { addSuffix: true })}</span>
            <span className="text-xs text-white/40">
              {format(date, "MMM d, yyyy")}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const ticket = row.original;
        const isUpdatingTicket = updatingTicketId === ticket.id;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0 text-white/70 hover:bg-white/10"
                >
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="border-white/10 bg-slate-900 text-white"
              >
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(ticket.id)}
                >
                  Copy ticket ID
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedTicket(ticket)}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                {statusOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    disabled={isUpdatingTicket}
                    onClick={() =>
                      onStatusChange(
                        ticket.id,
                        option.value as SupportTicket["status"],
                      )
                    }
                    className={
                      ticket.status === option.value ? "bg-white/10" : ""
                    }
                  >
                    Mark as {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  const statusFilterValue =
    (table.getColumn("status")?.getFilterValue() as string) ?? "all";

  return (
    <div className="space-y-4">
      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardContent className="flex flex-col items-center justify-between gap-4 p-4 sm:flex-row">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/50" />
            <Input
              placeholder="Search by message..."
              value={
                (table.getColumn("message")?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn("message")?.setFilterValue(event.target.value)
              }
              className="border-white/10 bg-black/20 pl-9 text-white placeholder:text-white/40"
            />
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            <Select
              value={statusFilterValue}
              onValueChange={(val) =>
                table.getColumn("status")?.setFilterValue(val)
              }
            >
              <SelectTrigger className="w-[180px] border-white/10 bg-black/20 text-white">
                <Filter className="mr-2 h-4 w-4 text-white/50" />
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-slate-900 text-white">
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="ml-auto border-white/10 bg-black/20 text-white hover:bg-white/10"
                >
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="border-white/10 bg-slate-900 text-white"
              >
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-white/10 bg-white/5 backdrop-blur">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-white/10 bg-black/20">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-white/10 hover:bg-transparent"
                >
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        className="h-12 text-xs font-semibold tracking-wider text-white/60 uppercase"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx} className="border-white/10">
                    <TableCell colSpan={columns.length} className="h-16">
                      <div className="flex animate-pulse space-x-4">
                        <div className="h-4 w-3/4 rounded bg-white/10"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer border-white/10 transition-colors hover:bg-white/5"
                    onClick={() => setSelectedTicket(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-4">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-white/60"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <MessageSquare className="mb-2 h-8 w-8 text-white/20" />
                      <p>No tickets found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 bg-black/20 px-4 py-4">
          <div className="text-sm text-white/50">
            Showing {table.getRowModel().rows.length} of {data.length} tickets
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="border-white/10 bg-transparent text-white hover:bg-white/10 disabled:opacity-50"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="border-white/10 bg-transparent text-white hover:bg-white/10 disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Ticket Detail Sheet */}
      <Sheet
        open={!!selectedTicket}
        onOpenChange={(open) => !open && setSelectedTicket(null)}
      >
        <SheetContent className="overflow-y-auto border-white/10 bg-slate-950 text-white sm:max-w-xl">
          {selectedTicket && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="mr-6 flex items-center justify-between gap-4">
                  <Badge
                    variant="secondary"
                    className={typeBadgeClassName[selectedTicket.type] || ""}
                  >
                    {selectedTicket.type.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-white/50">
                    {format(new Date(selectedTicket.created_at), "PPpp")}
                  </span>
                </div>
                <SheetTitle className="mt-4 text-xl text-white">
                  Ticket Details
                </SheetTitle>
                <SheetDescription className="text-white/60">
                  ID: {selectedTicket.id}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-white/80">
                    Message
                  </h3>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm whitespace-pre-wrap text-white/90">
                    {selectedTicket.message}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <h3 className="flex items-center gap-1 text-xs font-medium text-white/50">
                      <User className="h-3 w-3" /> User
                    </h3>
                    <p className="text-sm">
                      {selectedTicket.users?.full_name || "Anonymous"}
                    </p>
                    {selectedTicket.users?.email && (
                      <p className="text-xs text-white/60">
                        {selectedTicket.users.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="flex items-center gap-1 text-xs font-medium text-white/50">
                      <MonitorSmartphone className="h-3 w-3" /> System
                    </h3>
                    <p className="text-sm capitalize">
                      {selectedTicket.source || "Unknown"}
                    </p>
                    <p className="text-xs text-white/60">
                      {selectedTicket.platform
                        ? `${selectedTicket.platform} `
                        : ""}
                      {selectedTicket.app_version
                        ? `v${selectedTicket.app_version}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-white/80">Status</h3>
                  <Select
                    value={selectedTicket.status}
                    disabled={updatingTicketId === selectedTicket.id}
                    onValueChange={(val: SupportTicket["status"]) => {
                      onStatusChange(selectedTicket.id, val);
                      setSelectedTicket({ ...selectedTicket, status: val });
                    }}
                  >
                    <SelectTrigger
                      className={`w-full border-white/10 bg-black/20 text-white`}
                    >
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-slate-900 text-white">
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTicket.attachments &&
                  selectedTicket.attachments.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="flex items-center gap-1 text-sm font-medium text-white/80">
                        <Paperclip className="h-4 w-4" /> Attachments
                      </h3>
                      <TicketAttachments
                        attachments={selectedTicket.attachments}
                      />
                    </div>
                  )}

                {(selectedTicket.metadata || selectedTicket.diagnostics) && (
                  <div className="space-y-2 pt-4">
                    <Separator className="mb-4 bg-white/10" />
                    <h3 className="flex items-center gap-1 text-sm font-medium text-white/80">
                      <Code2 className="h-4 w-4" /> Technical Diagnostics
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4">
                      <pre className="text-xs text-white/60">
                        {JSON.stringify(
                          {
                            diagnostics: selectedTicket.diagnostics,
                            metadata: selectedTicket.metadata,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TicketAttachments({
  attachments,
}: {
  attachments: SupportTicketAttachment[];
}) {
  const [selectedImage, setSelectedImage] = useState<{
    alt: string;
    url: string;
  } | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {attachments.map((attachment) => (
          <TicketAttachmentCard
            key={attachment.id}
            attachment={attachment}
            onOpenImage={(image) => setSelectedImage(image)}
          />
        ))}
      </div>

      <Dialog
        open={selectedImage !== null}
        onOpenChange={(open) => !open && setSelectedImage(null)}
      >
        <DialogContent className="h-[100vh] max-w-none translate-x-[-50%] translate-y-[-50%] border-0 bg-black/95 p-6 shadow-none sm:h-[100vh] sm:max-w-none sm:rounded-none">
          {selectedImage ? (
            <>
              <DialogTitle className="sr-only">Attachment preview</DialogTitle>
              <DialogDescription className="sr-only">
                Fullscreen preview for {selectedImage.alt}
              </DialogDescription>
              <div className="flex h-full w-full items-center justify-center">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.alt}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TicketAttachmentCard({
  attachment,
  onOpenImage,
}: {
  attachment: SupportTicketAttachment;
  onOpenImage: (image: { alt: string; url: string }) => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [urlResolvedAt, setUrlResolvedAt] = useState<number | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [hasPreviewError, setHasPreviewError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const isRefreshingRef = useRef(false);

  const isImage = attachment.content_type?.startsWith("image/") ?? false;
  const fallbackLabel = attachment.file_path.split("/").pop() ?? "Attachment";
  const previewUrl = signedUrl ?? attachment.file_url;

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshSignedUrl = useCallback(async () => {
    if (isRefreshingRef.current) {
      return;
    }

    if (!attachment.file_path) {
      setSignedUrl(null);
      setUrlResolvedAt(null);
      setIsLoadingPreview(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    isRefreshingRef.current = true;

    setIsLoadingPreview(true);
    setHasPreviewError(false);

    const signedUrlPromise = supabase.storage
      .from("support-attachments")
      .createSignedUrl(attachment.file_path, 60 * 60);

    const timeoutPromise = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("signed_url_timeout")), 10_000);
    });

    try {
      const { data, error } = await Promise.race([
        signedUrlPromise,
        timeoutPromise,
      ]);

      if (!isMountedRef.current || requestIdRef.current !== requestId) {
        return;
      }

      if (error || !data?.signedUrl) {
        throw error ?? new Error("signed_url_unavailable");
      }

      setSignedUrl(data.signedUrl);
      setUrlResolvedAt(Date.now());
    } catch {
      if (!isMountedRef.current || requestIdRef.current !== requestId) {
        return;
      }

      setSignedUrl(null);
      setUrlResolvedAt(null);
      setHasPreviewError(!attachment.file_url);
    } finally {
      if (isMountedRef.current && requestIdRef.current === requestId) {
        setIsLoadingPreview(false);
      }

      if (requestIdRef.current === requestId) {
        isRefreshingRef.current = false;
      }
    }
  }, [attachment.file_path, attachment.file_url]);

  useEffect(() => {
    let cancelled = false;

    async function loadSignedUrl() {
      await refreshSignedUrl();

      if (cancelled) {
        return;
      }
    }

    void loadSignedUrl();

    return () => {
      cancelled = true;
    };
  }, [refreshSignedUrl, retryCount]);

  useEffect(() => {
    const handleVisibilityRefresh = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      const hasStaleUrl =
        urlResolvedAt !== null && Date.now() - urlResolvedAt > 45 * 60 * 1000;
      const shouldRefreshFallbackUrl =
        !signedUrl && Boolean(attachment.file_path);

      if (
        !previewUrl ||
        hasPreviewError ||
        hasStaleUrl ||
        shouldRefreshFallbackUrl
      ) {
        void refreshSignedUrl();
      }
    };

    window.addEventListener("focus", handleVisibilityRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      window.removeEventListener("focus", handleVisibilityRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [
    attachment.file_path,
    hasPreviewError,
    previewUrl,
    refreshSignedUrl,
    signedUrl,
    urlResolvedAt,
  ]);

  const handleRetry = () => {
    setRetryCount((currentCount) => currentCount + 1);
  };

  const previewContent = (() => {
    if (previewUrl && isImage && !hasPreviewError) {
      return (
        <div className="relative aspect-video bg-black/50">
          <img
            key={previewUrl}
            src={previewUrl}
            alt={fallbackLabel}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-contain transition-opacity duration-200"
            onError={() => {
              setHasPreviewError(true);
              setIsLoadingPreview(false);
            }}
            onLoad={() => {
              setHasPreviewError(false);
              setIsLoadingPreview(false);
            }}
          />
        </div>
      );
    }

    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-black/50 px-4 text-center">
        <Paperclip className="h-8 w-8 text-white/20" />
        {isLoadingPreview ? (
          <span className="text-xs text-white/40">Loading preview...</span>
        ) : hasPreviewError && isImage ? (
          <>
            <span className="text-xs text-white/40">
              Unable to preview image
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              className="h-7 px-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
            >
              Retry preview
            </Button>
          </>
        ) : null}
      </div>
    );
  })();

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-white/10 bg-white/5">
      {previewUrl && isImage && !hasPreviewError ? (
        <button
          type="button"
          onClick={() => onOpenImage({ alt: fallbackLabel, url: previewUrl })}
          className="block w-full transition-opacity hover:opacity-95"
        >
          {previewContent}
        </button>
      ) : (
        previewContent
      )}
      <div className="flex flex-col gap-2 bg-white/5 p-3 text-xs">
        <span
          className="truncate font-medium text-white/80"
          title={fallbackLabel}
        >
          {fallbackLabel}
        </span>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/50">
            {formatBytes(attachment.file_size_bytes || 0)}
          </span>
          {previewUrl && isImage ? (
            <button
              type="button"
              onClick={() =>
                onOpenImage({ alt: fallbackLabel, url: previewUrl })
              }
              className="text-primary hover:text-primary/80 transition-colors"
            >
              View
            </button>
          ) : previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              View
            </a>
          ) : hasPreviewError ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              className="h-7 px-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
            >
              Retry
            </Button>
          ) : (
            <span className="text-white/30">Unavailable</span>
          )}
        </div>
      </div>
    </div>
  );
}

async function fetchSupportTickets(): Promise<SupportTicketWithUser[]> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select(
      "*, users:users(full_name, email, avatar_url), attachments:support_ticket_attachments(*)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load support tickets", error);
    throw error;
  }

  return (data as SupportTicketWithUser[]) ?? [];
}

async function fetchCreatorAccess(
  userId: string,
): Promise<CreatorAccessProfile> {
  const { data, error } = await supabase
    .from("users")
    .select("id, is_creator")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to verify creator access", error);
    throw error;
  }

  return {
    id: data?.id ?? userId,
    is_creator: data?.is_creator ?? false,
  };
}

async function updateTicketStatus({
  id,
  status,
}: {
  id: string;
  status: SupportTicket["status"];
}) {
  const isResolved = isResolvedStatus(status);
  const { error } = await supabase
    .from("support_tickets")
    .update({
      status,
      is_resolved: isResolved,
      resolved_at: isResolved ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    console.error("Unable to update ticket status", error);
    throw error;
  }
}

function buildStatusStats(tickets: SupportTicketWithUser[]) {
  return tickets.reduce<Record<string, number>>((acc, ticket) => {
    acc[ticket.status] = (acc[ticket.status] ?? 0) + 1;
    return acc;
  }, {});
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isResolvedStatus(status: SupportTicket["status"]) {
  return status === "resolved" || status === "closed";
}

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting_on_user", label: "Waiting on user" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

const statusCards: {
  key: SupportTicket["status"];
  label: string;
  className: string;
}[] = [
  {
    key: "open",
    label: "Open",
    className:
      "border-white/10 bg-gradient-to-br from-rose-500/20 to-transparent",
  },
  {
    key: "in_progress",
    label: "In progress",
    className:
      "border-white/10 bg-gradient-to-br from-amber-500/20 to-transparent",
  },
  {
    key: "waiting_on_user",
    label: "Waiting on user",
    className:
      "border-white/10 bg-gradient-to-br from-sky-500/20 to-transparent",
  },
  {
    key: "resolved",
    label: "Resolved",
    className:
      "border-white/10 bg-gradient-to-br from-emerald-500/20 to-transparent",
  },
];

const statusBadgeClassName: Record<SupportTicket["status"], string> = {
  open: "bg-rose-500/20 text-rose-200 border-rose-500/50",
  in_progress: "bg-amber-500/20 text-amber-200 border-amber-500/50",
  waiting_on_user: "bg-sky-500/20 text-sky-200 border-sky-500/50",
  resolved: "bg-emerald-500/20 text-emerald-200 border-emerald-500/50",
  closed: "bg-slate-600/30 text-slate-200 border-slate-500/40",
};

const typeBadgeClassName: Record<SupportTicket["type"], string> = {
  bug: "bg-rose-500/15 text-rose-200 border-rose-500/40",
  feedback: "bg-blue-500/15 text-blue-200 border-blue-500/40",
  feature_request: "bg-purple-500/15 text-purple-200 border-purple-500/40",
  other: "bg-slate-500/20 text-slate-200 border-slate-500/40",
};

type SupportTicket = Database["public"]["Tables"]["support_tickets"]["Row"];
type SupportTicketWithUser = SupportTicket & {
  users?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  attachments?: SupportTicketAttachment[] | null;
};

type SupportTicketAttachment =
  Database["public"]["Tables"]["support_ticket_attachments"]["Row"];

interface CreatorAccessProfile {
  id: string;
  is_creator: boolean;
}
