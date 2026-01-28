'use client'

import { UserPlus, Settings, CalendarCheck, FileDown } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create Your Account",
    description: "Sign up in seconds and set up your service provider profile. No credit card required.",
  },
  {
    icon: Settings,
    step: "02",
    title: "Configure Line Items",
    description: "Add your NDIS line item codes with rates, time windows, and day-specific pricing rules.",
  },
  {
    icon: CalendarCheck,
    step: "03",
    title: "Schedule Shifts",
    description: "Add carers and clients, then use the calendar to schedule and manage shifts effortlessly.",
  },
  {
    icon: FileDown,
    step: "04",
    title: "Generate Invoices",
    description: "Export professional invoices with a single click. Bulk generate for any date range.",
  },
];

export function HowItWorks(props?: any) {
  return (
    <section id="how-it-works" className="relative py-32 md:py-40 px-6">
      
      <div className="container relative">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6">
            <span className="text-sm">🚀</span>
            <span className="text-sm text-muted-foreground">Simple Process</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Up and Running in{" "}
            <span className="gradient-text">Minutes</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Get started quickly with our intuitive setup process. No training required.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.step} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary/50 to-transparent" />
              )}

              <div className="flex flex-col items-center text-center">
                {/* Step number */}
                <div className="relative mb-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl">
                    <step.icon className="h-9 w-9 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/30">
                    {step.step}
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
