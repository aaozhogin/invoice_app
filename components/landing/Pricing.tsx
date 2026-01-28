'use client'

import { Button } from "@/components/ui/button";
import { Check, ArrowUpRight, Sparkles } from "lucide-react";

const includedFeatures = [
  "Unlimited shifts & scheduling",
  "Unlimited carers & clients",
  "All NDIS line item configurations",
  "Professional invoice generation",
  "Reports & analytics",
  "Excel export functionality",
  "Custom carer branding",
  "Priority support",
];

export function Pricing(props?: any) {
  return (
    <section id="pricing" className="relative py-32 md:py-40 px-6">
      
      <div className="container relative">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Early Access</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Full Access,{" "}
            <span className="gradient-text">Zero Cost</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            We're currently in early access. Get full access to all features while we refine the platform together.
          </p>
        </div>

        {/* Pricing card */}
        <div className="max-w-lg mx-auto">
          <div className="relative p-8 md:p-10">
            {/* Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-lg shadow-primary/30">
                <Sparkles className="h-4 w-4" />
                Early Access Beta
              </div>
            </div>

            {/* Price */}
            <div className="text-center pt-4 mb-8">
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-6xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-muted-foreground">
                Full access during our testing period
              </p>
            </div>

            {/* Features list */}
            <ul className="space-y-4 mb-8">
              {includedFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Button variant="hero" size="xl" className="w-full" asChild>
              <a href="https://ndisapp.onmanylevels.com/signup" className="flex items-center justify-center gap-2">
                Get Started Free <ArrowUpRight className="h-5 w-5" />
              </a>
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-4">
              No credit card required • No commitment
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
