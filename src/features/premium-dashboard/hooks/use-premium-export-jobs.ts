import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { PremiumExportJob, ExportType } from "../types";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "react-toastify";

async function getFunctionErrorMessage(
  error: any,
  fallback: string,
): Promise<string> {
  if (error instanceof FunctionsHttpError && error.context) {
    try {
      const body = await error.context.json();
      return body.error || body.message || fallback;
    } catch {
      // ignore parse errors, fall through to generic message
    }
  }
  return error?.message || fallback;
}

export function usePremiumExportJobs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const listJobs = useQuery<PremiumExportJob[]>({
    queryKey: ["premium-export-jobs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "premium-export-center",
        {
          body: { action: "list" },
        },
      );
      if (error)
        throw new Error(
          await getFunctionErrorMessage(error, "Failed to list export jobs"),
        );
      if (!data?.success)
        throw new Error(
          data?.error || data?.message || "Failed to list export jobs",
        );
      return data.data as PremiumExportJob[];
    },
    enabled: Boolean(user?.id),
    staleTime: 10_000,
  });

  const createJob = useMutation({
    mutationFn: async ({
      exportType,
      filters,
    }: {
      exportType: ExportType;
      filters?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "premium-export-center",
        {
          body: { action: "create", exportType, filters },
        },
      );
      if (error)
        throw new Error(
          await getFunctionErrorMessage(error, "Failed to create export job"),
        );
      if (!data?.success)
        throw new Error(
          data?.error || data?.message || "Failed to create export job",
        );
      return data.data as PremiumExportJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["premium-export-jobs", user?.id],
      });
      toast.success(
        "Secure compilation started! It will appear below when ready.",
      );
    },
    onError: (error) => {
      toast.error(
        error.message || "Failed to start secure export. Please try again.",
      );
    },
  });

  const downloadJob = async (jobId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "premium-export-center",
        {
          body: { action: "download", jobId },
        },
      );
      if (error)
        throw new Error(
          await getFunctionErrorMessage(error, "Failed to download export job"),
        );
      if (!data?.success)
        throw new Error(
          data?.error || data?.message || "Failed to download export job",
        );
      if (data?.data?.signedUrl) {
        toast.success("Secure download starting...");
        window.open(data.data.signedUrl, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("No secure download link received");
      }
    } catch (error: any) {
      toast.error(
        error.message || "Failed to securely download file. Please try again.",
      );
    }
  };

  const downloadAttachment = async (attachmentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "premium-export-center",
        {
          body: { action: "download_attachment", attachmentId },
        },
      );
      if (error)
        throw new Error(
          await getFunctionErrorMessage(error, "Failed to download attachment"),
        );
      if (!data?.success)
        throw new Error(
          data?.error || data?.message || "Failed to download attachment",
        );
      if (data?.data?.signedUrl) {
        toast.success("Secure attachment download starting...");
        window.open(data.data.signedUrl, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("No secure download link received");
      }
    } catch (error: any) {
      toast.error(
        error.message ||
          "Failed to securely download attachment. Please try again.",
      );
    }
  };

  return {
    jobs: listJobs.data ?? [],
    isLoading: listJobs.isLoading,
    error: listJobs.error,
    createJob,
    downloadJob,
    downloadAttachment,
    refetch: listJobs.refetch,
  };
}

export interface PremiumExportAttachment {
  id: string;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export function usePremiumExportAttachments(filters: {
  startDate?: string;
  endDate?: string;
}) {
  const { user } = useAuth();

  return useQuery<PremiumExportAttachment[]>({
    queryKey: ["premium-export-attachments", user?.id, filters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "premium-export-center",
        {
          body: { action: "list_attachments", filters },
        },
      );
      if (error)
        throw new Error(
          await getFunctionErrorMessage(error, "Failed to list attachments"),
        );
      if (!data?.success)
        throw new Error(
          data?.error || data?.message || "Failed to list attachments",
        );
      return data.data as PremiumExportAttachment[];
    },
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });
}

export function usePremiumExportJobStatus(jobId?: string) {
  const { user } = useAuth();

  return useQuery<PremiumExportJob>({
    queryKey: ["premium-export-job-status", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("No job ID");
      const { data, error } = await supabase.functions.invoke(
        "premium-export-center",
        {
          body: { action: "status", jobId },
        },
      );
      if (error)
        throw new Error(
          await getFunctionErrorMessage(
            error,
            "Failed to fetch export job status",
          ),
        );
      if (!data?.success)
        throw new Error(
          data?.error || data?.message || "Failed to fetch export job status",
        );
      return data.data as PremiumExportJob;
    },
    enabled: Boolean(user?.id && jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (
        status === "queued" ||
        status === "preparing" ||
        status === "collecting_files" ||
        status === "generating"
      ) {
        return 2000;
      }
      return false;
    },
  });
}
