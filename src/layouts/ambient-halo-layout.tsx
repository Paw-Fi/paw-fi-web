import AmbientHalo from "@/components/ui/ambient-halo";

interface AmbientHaloLayoutProps {
  children: React.ReactNode;
}

export const AmbientHaloLayout = ({ children }: AmbientHaloLayoutProps) => {
  return (
    <div className="relative h-full w-full flex-1 bg-background dark:bg-dark-background">
      <AmbientHalo />
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
};