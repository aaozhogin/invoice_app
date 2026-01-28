'use client'

import { Button } from "@/components/ui/button";
import { ArrowUpRight, Calendar, Users, FileSpreadsheet } from "lucide-react";
import { OMLLogo } from "./OMLLogo";

export function Hero(props?: any) {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-32 pb-32 overflow-hidden px-6">
      {/* Subtle gradient overlay - more transparent to show particles */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-transparent to-background/80 pointer-events-none" />
      
      {/* Floating elements */}
      <div className="absolute top-1/4 left-[10%] float delay-100 hidden lg:block">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center glow-border backdrop-blur-sm">
          <Calendar className="w-8 h-8 text-primary" />
        </div>
      </div>
      <div className="absolute top-1/3 right-[15%] float delay-300 hidden lg:block">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center glow-border backdrop-blur-sm">
          <Users className="w-7 h-7 text-primary" />
        </div>
      </div>
      <div className="absolute bottom-1/3 left-[20%] float delay-500 hidden lg:block">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center glow-border backdrop-blur-sm">
          <FileSpreadsheet className="w-6 h-6 text-primary" />
        </div>
      </div>

      {/* Decorative OML logos in background */}
      <div className="absolute top-[20%] right-[8%] opacity-10 hidden xl:block">
        <OMLLogo size="lg" showText={false} />
      </div>
      <div className="absolute bottom-[25%] right-[5%] opacity-5 hidden xl:block scale-150">
        <OMLLogo size="lg" showText={false} />
      </div>
      <div className="absolute top-[60%] left-[5%] opacity-5 hidden xl:block rotate-12">
        <OMLLogo size="lg" showText={false} />
      </div>

      <div className="container relative">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Badge with OML branding */}
          <div className="fade-in-up mb-8">
            <div className="inline-flex items-center gap-3 px-4 py-2">
              <OMLLogo size="sm" showText={false} />
              <div className="h-4 w-px bg-border/20" />
              <span className="text-sm text-muted-foreground">NDIS Service Provider Solution</span>
            </div>
          </div>

          {/* Main heading */}
          <h1 className="fade-in-up delay-100 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Simplify Your{" "}
            <span className="gradient-text text-glow">NDIS Invoicing</span>
            <br />
            & Shift Management
          </h1>

          {/* Subtitle */}
          <p className="fade-in-up delay-200 text-lg md:text-xl text-muted-foreground max-w-2xl mb-8">
            A comprehensive solution designed for NDIS service providers. 
            Manage shifts, track clients, and generate professional invoices—all in one place.
          </p>

          {/* Early access badge */}
          <div className="fade-in-up delay-300 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-primary">Early access — currently free during beta</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="fade-in-up delay-400 flex flex-col sm:flex-row gap-4">
            <Button variant="hero" size="xl" asChild>
              <a href="https://ndisapp.onmanylevels.com/signup" className="flex items-center gap-2">
                Start Free Now <ArrowUpRight className="h-5 w-5" />
              </a>
            </Button>
            <Button variant="hero-outline" size="xl" asChild>
              <a href="#features">Explore Features</a>
            </Button>
          </div>

          {/* Trust indicator with OML */}
          <div className="fade-in-up delay-500 mt-16 flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">Proudly built by</p>
            <a 
              href="https://onmanylevels.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-3 transition-all group"
            >
              <OMLLogo size="md" showText={false} />
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold group-hover:text-primary transition-colors">On Many Levels</span>
                <span className="text-xs text-muted-foreground">Atlassian Solution Partner</span>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground">
        <span className="text-xs">Scroll to explore</span>
        <div className="w-5 h-8 rounded-full border border-border flex items-start justify-center p-1">
          <div className="w-1 h-2 rounded-full bg-primary animate-bounce" />
        </div>
      </div>
    </section>
  );
}
