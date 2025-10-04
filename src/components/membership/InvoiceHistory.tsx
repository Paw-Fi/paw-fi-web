import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, ExternalLink, Download, Receipt, AlertCircle, History } from "lucide-react";

interface Invoice {
  id: string;
  amount_paid: number;
  currency: string;
  status: string;
  created: string;
  hosted_invoice_url: string;
  pdf: string;
}

interface InvoiceHistoryProps {
  invoices: Invoice[];
}

export function InvoiceHistory({ invoices }: InvoiceHistoryProps) {
  // Format currency based on currency code
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "open":
        return "secondary";
      case "uncollectible":
        return "destructive";
      case "void":
        return "outline";
      default:
        return "outline";
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "text-green-600";
      case "open": return "text-blue-600";
      case "uncollectible": return "text-red-600";
      case "void": return "text-slate-500";
      default: return "text-slate-600";
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-xl text-foreground">
              <History className="mr-3 h-5 w-5 text-muted-foreground" />
              Billing History
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {invoices && invoices.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="font-medium text-muted-foreground">Date</TableHead>
                      <TableHead className="font-medium text-muted-foreground">Amount</TableHead>
                      <TableHead className="font-medium text-muted-foreground">Status</TableHead>
                      <TableHead className="text-right font-medium text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice, index) => (
                      <motion.tr
                        key={invoice.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        className="transition-colors hover:bg-muted/20"
                      >
                        <TableCell>
                          <div className="flex items-center space-x-3">
                           
                            <span className="font-medium text-foreground">
                              {formatDate(invoice.created)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(invoice.amount_paid, invoice.currency)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getStatusBadgeVariant(invoice.status)}
                            className="capitalize"
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            {invoice.hosted_invoice_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <a
                                  href={invoice.hosted_invoice_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  <span className="sr-only">View Invoice</span>
                                </a>
                              </Button>
                            )}
                            {invoice.pdf && (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <a
                                  href={invoice.pdf}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center"
                                >
                                  <Download className="h-4 w-4" />
                                  <span className="sr-only">Download PDF</span>
                                </a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted/50 p-4">
                  <FileText className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  No billing history
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your invoices and payment history will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
