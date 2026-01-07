import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, Minus, X } from "lucide-react";

const features = [
  {
    name: "Capture Method",
    moneko: "Text, Photo, Voice, File (AI)",
    ynab: "Manual / Bank Import",
    monarch: "Bank Import (Dashboard first)",
  },
  {
    name: "Budgeting Style",
    moneko: "Zero-based Pockets (Monthly)",
    ynab: "Strict Zero-based Envelopes",
    monarch: "Forecast / Plan",
  },
  {
    name: "Household / Joint",
    moneko: "Built-in Core Feature",
    ynab: "Shared Budget (Manual)",
    monarch: "Shared Access",
  },
  {
    name: "Scenario Planning",
    moneko: "AI Conversational \"What if?\"",
    ynab: "Manual Calculation",
    monarch: "Graph / Projection Tools",
  },
  {
    name: "WhatsApp Assistant",
    moneko: true,
    ynab: false,
    monarch: false,
  },
  {
    name: "Home Screen Widgets",
    moneko: true,
    ynab: "Limited",
    monarch: "Limited",
  },
];

export function ComparisonTable() {
  return (
    <div className="py-24 bg-secondary/30 dark:bg-transparent">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-foreground">
            Why choose Moneko?
          </h2>
          <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
            Built for people who want the benefits of budgeting without the chore of data entry.
          </p>
        </div>

        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px] font-bold text-lg p-6">Features</TableHead>
                <TableHead className="text-center font-bold text-lg text-primary bg-primary/5 dark:bg-primary/10 p-6 border-b-2 border-primary">Moneko</TableHead>
                <TableHead className="text-center font-bold text-lg text-muted-foreground p-6">YNAB</TableHead>
                <TableHead className="text-center font-bold text-lg text-muted-foreground p-6">Monarch Money</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((feature, index) => (
                <TableRow key={feature.name} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                  <TableCell className="font-medium p-6 text-foreground">{feature.name}</TableCell>
                  <TableCell className="text-center p-6 bg-primary/5 dark:bg-primary/10 font-medium border-x border-primary/10 dark:border-primary/20">
                    {feature.moneko === true ? (
                      <div className="flex justify-center">
                        <Check className="h-6 w-6 text-primary" />
                      </div>
                    ) : (
                      <span className="text-foreground">{feature.moneko}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center p-6 text-muted-foreground">
                    {feature.ynab === false ? (
                      <div className="flex justify-center">
                        <X className="h-5 w-5 opacity-50 dark:text-white" />
                      </div>
                    ) : feature.ynab === "Limited" ? (
                        <span className="text-sm">Limited</span>
                    ) : (
                      <span>{feature.ynab}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center p-6 text-muted-foreground">
                    {feature.monarch === false ? (
                      <div className="flex justify-center">
                        <X className="h-5 w-5 opacity-50 dark:text-white" />
                      </div>
                    ) : feature.monarch === "Limited" ? (
                        <span className="text-sm">Limited</span>
                    ) : (
                      <span>{feature.monarch}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
