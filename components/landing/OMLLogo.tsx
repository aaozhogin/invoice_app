'use client'

interface OMLLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function OMLLogo(props: OMLLogoProps = {}) {
  const { size = "md", showText = false, className = "" } = props;
  
  const sizeClasses: Record<"sm" | "md" | "lg", string> = {
    sm: "h-8",
    md: "h-10",
    lg: "h-14",
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src="/assets/oml-logo.png" 
        alt="On Many Levels" 
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
      {showText && (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-primary uppercase tracking-wider">ON</span>
          <span className="text-xs font-medium text-primary uppercase tracking-wider -mt-1">MANY</span>
          <span className="text-xs font-medium text-primary uppercase tracking-wider -mt-1">LEVELS</span>
        </div>
      )}
    </div>
  );
}
