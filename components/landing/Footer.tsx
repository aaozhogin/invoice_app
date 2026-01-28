'use client'

import { OMLLogo } from "./OMLLogo";

export function Footer(props?: any) {
  return (
    <footer className="relative border-t border-border">
      <div className="absolute inset-0 bg-card/80 backdrop-blur-md" />
      <div className="container py-12 relative">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <OMLLogo size="md" showText={false} />
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold tracking-tight">NDIS App</span>
              <span className="text-xs text-muted-foreground -mt-0.5">by On Many Levels</span>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How It Works
            </a>
            <a 
              href="https://onmanylevels.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              On Many Levels
            </a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} On Many Levels. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
