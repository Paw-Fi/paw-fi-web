import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";
import { planComparisonFeatures, planData } from "@/data/pricing-plans";

interface FeatureComparisonGridProps {
  prefersReducedMotion?: boolean;
}

export function FeatureComparisonGrid({
  prefersReducedMotion,
}: FeatureComparisonGridProps) {
  void prefersReducedMotion;
  // Only show plus and premium plans
  const plans = [planData.plus, planData.premium];

  return (
    <div className="bg-card mt-20 overflow-hidden rounded-xl shadow-sm">
      <div className="bg-muted/30 border-border/50 rounded-t-xl border-b px-8 py-6">
        <h3 className="text-foreground text-xl font-bold">
          Plan Features at a Glance
        </h3>
        <p className="text-muted-foreground mt-2">
          Compare what’s included in Plus and Premium
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/10 border-border/50 border-b">
              <th className="text-foreground px-8 py-5 text-left text-sm font-semibold">
                Feature
              </th>
              {plans.map((plan) => (
                <th
                  key={plan.id}
                  className="text-foreground px-6 py-5 text-center text-sm font-semibold"
                >
                  {plan.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {planComparisonFeatures.map((feature) => (
              <tr
                key={feature.category}
                className="hover:bg-muted/30 border-border/20 border-b transition-colors duration-150 last:border-0"
              >
                <td className="px-8 py-4">
                  <div className="text-foreground text-sm font-medium">
                    {feature.category}
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {feature.description}
                  </div>
                </td>
                {plans.map((plan) => {
                  const planFeature = feature.values[plan.id];
                  return (
                    <td key={plan.id} className="px-6 py-4 text-center">
                      {planFeature.included === true ? (
                        <div className="flex flex-col items-center">
                          <FontAwesomeIcon
                            icon={faCheck}
                            className="text-primary h-5 w-5"
                          />
                        </div>
                      ) : planFeature.included === false ? (
                        <FontAwesomeIcon
                          icon={faTimes}
                          className="text-muted-foreground/30 h-5 w-5"
                        />
                      ) : (
                        <span className="text-primary text-xs font-semibold">
                          {planFeature.label}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
