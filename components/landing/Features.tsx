'use client'

import { Calendar, Users, DollarSign, FileSpreadsheet, BarChart3, Clock } from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Calendar & Shifts",
    description: "Intuitive drag-and-drop calendar interface. View by day or week, create shifts effortlessly, and watch costs calculate automatically based on NDIS rates.",
    emoji: "📅",
  },
  {
    icon: Users,
    title: "Carers & Clients",
    description: "Maintain comprehensive records for carers (ABN, bank details, contact info) and clients (NDIS number, address) all in one organized place.",
    emoji: "👥",
  },
  {
    icon: DollarSign,
    title: "NDIS Line Items",
    description: "Configure NDIS line item codes with rates, time windows, and day-specific pricing. Full support for weekday/weekend rates, public holidays, and sleepovers.",
    emoji: "💰",
  },
  {
    icon: FileSpreadsheet,
    title: "Invoice Generation",
    description: "Generate professional Excel invoices with automatic totals, formatted dates, and custom carer logos. Bulk generate for any date range.",
    emoji: "🧾",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "Track shift costs, hours worked, and generate summaries by carer, client, or time period. Export data for seamless accounting.",
    emoji: "📊",
  },
  {
    icon: Clock,
    title: "Time-Based Pricing",
    description: "Automatic rate calculations based on time of day, day of week, and public holidays. No more manual rate lookups.",
    emoji: "⏰",
  },
];

export function Features(props?: any) {
  return (
    <section id="features" className="relative py-32 md:py-40 px-6">
      
      <div className="container relative">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6">
            <span className="text-sm">✨</span>
            <span className="text-sm text-muted-foreground">Everything You Need</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Powerful Features for{" "}
            <span className="gradient-text">NDIS Providers</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Built specifically for NDIS service providers, with every feature designed to save you time and reduce administrative burden.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="feature-card group p-8"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="text-3xl">{feature.emoji}</span>
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
