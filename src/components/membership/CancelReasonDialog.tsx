import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type CancelReasonId =
  | "too_expensive"
  | "found_alternative"
  | "not_using_enough"
  | "app_issue"
  | "missing_specific_feature"
  | "other";

type CancelReason = {
  id: CancelReasonId;
  label: string;
  detailPlaceholder?: string;
};

const cancelReasons: readonly CancelReason[] = [
  { id: "too_expensive", label: "It's too expensive" },
  { id: "found_alternative", label: "I found an alternative" },
  { id: "not_using_enough", label: "I'm not using it enough" },
  {
    id: "app_issue",
    label: "I'm having an issue with the app",
    detailPlaceholder: "Tell us what went wrong",
  },
  {
    id: "missing_specific_feature",
    label: "A feature I need is missing",
    detailPlaceholder: "Which feature would make Moneko work better for you?",
  },
  {
    id: "other",
    label: "Other",
    detailPlaceholder: "Tell us more",
  },
];

export type CancelReasonSubmission = {
  reasonId: CancelReasonId;
  reasonLabel: string;
  detailText: string | null;
};

interface CancelReasonDialogProps {
  open: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (submission: CancelReasonSubmission | null) => void;
}

export function CancelReasonDialog({
  open,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: CancelReasonDialogProps) {
  const [selectedReasonId, setSelectedReasonId] = useState<
    CancelReason["id"] | null
  >(null);
  const [detailText, setDetailText] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedReasonId(null);
      setDetailText("");
    }
  }, [open]);

  const selectedReason = cancelReasons.find(
    (reason) => reason.id === selectedReasonId,
  );
  const requiresDetail = Boolean(selectedReason?.detailPlaceholder);
  const canSubmitReason =
    selectedReason !== undefined &&
    (!requiresDetail || detailText.trim().length > 0);

  const submitReason = () => {
    if (!selectedReason || !canSubmitReason) return;

    onSubmit({
      reasonId: selectedReason.id,
      reasonLabel: selectedReason.label,
      detailText: requiresDetail ? detailText.trim() : null,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Before you go</DialogTitle>
          <DialogDescription>
            What is the main reason you&apos;re cancelling? Your feedback is
            optional, but it helps us improve Moneko.
          </DialogDescription>
        </DialogHeader>

        <div
          className="space-y-2"
          role="radiogroup"
          aria-label="Cancellation reason"
        >
          {cancelReasons.map((reason) => {
            const isSelected = selectedReasonId === reason.id;
            return (
              <button
                key={reason.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={isSubmitting}
                onClick={() => {
                  setSelectedReasonId(reason.id);
                  if (!reason.detailPlaceholder) setDetailText("");
                }}
                className={`focus-visible:ring-ring flex min-h-[44px] w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/50"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-5 w-5 shrink-0 rounded-full border-2 ${
                    isSelected
                      ? "border-primary border-[6px]"
                      : "border-muted-foreground/50"
                  }`}
                />
                {reason.label}
              </button>
            );
          })}
        </div>

        {requiresDetail && (
          <div className="space-y-2">
            <label
              className="text-foreground text-sm font-medium"
              htmlFor="cancel-reason-detail"
            >
              Tell us more
            </label>
            <Textarea
              id="cancel-reason-detail"
              value={detailText}
              onChange={(event) => setDetailText(event.target.value)}
              placeholder={selectedReason?.detailPlaceholder}
              minLength={1}
              maxLength={500}
              rows={3}
              disabled={isSubmitting}
              required
            />
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onSubmit(null)}
            disabled={isSubmitting}
          >
            {isSubmitting && !selectedReason ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Skip & cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={submitReason}
            disabled={!canSubmitReason || isSubmitting}
          >
            {isSubmitting && selectedReason ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Cancel subscription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
