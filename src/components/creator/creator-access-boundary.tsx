import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";

export function CreatorAccessBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();

  const creatorAccessQuery = useQuery({
    queryKey: ["creator-access", user?.id],
    queryFn: async () => fetchCreatorAccess(user!.id),
    enabled: !isAuthLoading && !!user,
    staleTime: 60_000,
    retry: false,
  });

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
    return <CreatorAccessState message="Checking your session..." />;
  }

  if (creatorAccessQuery.isLoading || creatorAccessQuery.isPending) {
    return <CreatorAccessState message="Verifying creator access..." />;
  }

  if (!creatorAccessQuery.data?.is_creator) {
    return <CreatorAccessState message="Redirecting..." />;
  }

  return <>{children}</>;
}

function CreatorAccessState({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="text-sm text-slate-300">{message}</div>
    </div>
  );
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

interface CreatorAccessProfile {
  id: string;
  is_creator: boolean;
}
