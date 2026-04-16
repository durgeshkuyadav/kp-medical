import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface OnboardingChecklistProps {
  hasShopSettings: boolean;
  hasMedicines: boolean;
  hasPatients: boolean;
  hasSales: boolean;
  hasUpiId: boolean;
}

const steps = [
  { key: "hasShopSettings", label: "Configure shop settings", description: "Set your shop name, address, and logo", link: "/settings" },
  { key: "hasUpiId", label: "Add UPI ID for payments", description: "Enable digital payment collection", link: "/settings" },
  { key: "hasMedicines", label: "Add your first medicine", description: "Stock your inventory with medicines", link: "/inventory" },
  { key: "hasPatients", label: "Register a patient", description: "Add patient records for billing", link: "/patients" },
  { key: "hasSales", label: "Complete your first sale", description: "Process a billing transaction", link: "/sales" },
];

export function OnboardingChecklist(props: OnboardingChecklistProps) {
  const completedCount = useMemo(
    () => steps.filter((s) => props[s.key as keyof OnboardingChecklistProps]).length,
    [props]
  );

  if (completedCount >= steps.length) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>🚀 Get Started</span>
          <span className="text-sm font-normal text-muted-foreground">
            {completedCount}/{steps.length} completed
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step) => {
          const done = props[step.key as keyof OnboardingChecklistProps];
          return (
            <Link
              key={step.key}
              to={done ? "#" : step.link}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                done
                  ? "bg-muted/50 opacity-60"
                  : "bg-card hover:bg-accent border cursor-pointer"
              }`}
            >
              {done ? (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? "line-through" : ""}`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {!done && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />}
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
