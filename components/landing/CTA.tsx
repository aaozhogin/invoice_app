'use client'

import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

export function CTA(props?: any) {
  return (
    <section className="relative py-32 md:py-40 px-6 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/20 blur-[120px]" />
      </div>

      <div className="container relative">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Ready to Simplify Your{" "}
            <span className="gradient-text">NDIS Administration?</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join other NDIS service providers who are saving hours every week with streamlined invoicing and shift management.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl" asChild>
              <a href="https://ndisapp.onmanylevels.com/signup" className="flex items-center gap-2">
                Create Free Account <ArrowUpRight className="h-5 w-5" />
              </a>
            </Button>
            <Button variant="hero-outline" size="xl" asChild>
              <a href="https://ndisapp.onmanylevels.com/login">Sign In</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
