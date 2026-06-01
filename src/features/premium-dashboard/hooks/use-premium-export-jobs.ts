import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { PremiumExportJob, ExportType } from "../types";
import { useAuth } from "@/contexts/auth-context";

export function usePremiumExportJobs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const listJobs = useQuery<PremiumExportJob[]>({
    queryKey: ["premium-export-jobs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("premium-export-center", {
        body: { action: "list" },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to list export jobs");
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
      const { data, error } = await supabase.functions.invoke("premium-export-center", {
        body: { action: "create", exportType, filters },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to create export job");
      return data.data as PremiumExportJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["premium-export-jobs", user?.id] });
    },
  });

  const downloadJob = async (jobId: string) => {
    const { data, error } = await supabase.functions.invoke("premium-export-center", {
      body: { action: "download", jobId },
    });
    if (error) throw new Error(error.message);
    if (!data?.success) throw new Error(data?.error || "Failed to download export job");
    if (data?.data?.signedUrl) {
      window.open(data.data.signedUrl, "_blank");
    }
  };

  return {
    jobs: listJobs.data ?? [],
    isLoading: listJobs.isLoading,
    error: listJobs.error,
    createJob,
    downloadJob,
    refetch: listJobs.refetch,
  };
}

export function usePremiumExportJobStatus(jobId?: string) {
  const { user } = useAuth();

  return useQuery<PremiumExportJob>({
    queryKey: ["premium-export-job-status", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("No job ID");
      const { data, error } = await supabase.functions.invoke("premium-export-center", {
        body: { action: "status", jobId },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to fetch export job status");
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
