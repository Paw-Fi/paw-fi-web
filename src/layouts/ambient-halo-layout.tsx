import AmbientHalo from "@/components/ui/ambient-halo";

export const AmbientHaloLayout = (props: any) => {
    return (
      <div className="relative h-full w-full flex-1">
        <AmbientHalo />
        <div className="z-5 absolute left-0 top-0 h-full w-full">
          {props.children}
        </div>
      </div>
    );
  };