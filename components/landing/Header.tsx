'use client'

import { Button } from "@/components/ui/button";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { OMLLogo } from "./OMLLogo";
import { useState } from "react";

export function Header(props?: any) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          <OMLLogo size="md" showText={false} />
          <div className="h-6 w-px bg-border" />
          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight">NDIS App</span>
            <span className="text-xs text-muted-foreground -mt-0.5">Shift & Invoice Management</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <a href="https://ndisapp.onmanylevels.com/login">Sign In</a>
          </Button>
          <Button variant="hero" size="sm" asChild>
            <a href="https://ndisapp.onmanylevels.com/signup" className="flex items-center gap-1.5">
              Get Started <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>
        </div>

        {/* Mobile menu button */}
        <button 
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <nav className="container py-4 flex flex-col gap-4">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" size="sm" asChild>
                <a href="https://ndisapp.onmanylevels.com/login">Sign In</a>
              </Button>
              <Button variant="hero" size="sm" asChild>
                <a href="https://ndisapp.onmanylevels.com/signup">Get Started</a>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
