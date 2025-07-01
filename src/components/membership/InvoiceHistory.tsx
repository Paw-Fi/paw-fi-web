import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileInvoice,
  faExternalLinkAlt,
  faDownload,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";

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

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "open":
        return "bg-blue-100 text-blue-800";
      case "uncollectible":
        return "bg-red-100 text-red-800";
      case "void":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900">Billing History</h3>

        {invoices && invoices.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Amount
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <FontAwesomeIcon
                          icon={faFileInvoice}
                          className="mr-3 h-5 w-5 text-gray-400"
                        />
                        <span className="text-sm text-gray-900">
                          {formatDate(invoice.created)}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(invoice.amount_paid, invoice.currency)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(
                          invoice.status
                        )}`}
                      >
                        {invoice.status.charAt(0).toUpperCase() +
                          invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        {invoice.hosted_invoice_url && (
                          <a
                            href={invoice.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary-dark"
                          >
                            <FontAwesomeIcon
                              icon={faExternalLinkAlt}
                              className="h-4 w-4"
                            />
                            <span className="sr-only">View Invoice</span>
                          </a>
                        )}
                        {invoice.pdf && (
                          <a
                            href={invoice.pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary-dark"
                          >
                            <FontAwesomeIcon
                              icon={faDownload}
                              className="h-4 w-4"
                            />
                            <span className="sr-only">Download PDF</span>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-8">
            <div className="text-center">
              <FontAwesomeIcon
                icon={faInfoCircle}
                className="mb-2 h-6 w-6 text-gray-400"
              />
              <p className="text-sm text-gray-500">No invoices found</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
