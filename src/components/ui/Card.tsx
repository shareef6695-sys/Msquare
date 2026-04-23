import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div
    className={cn(
      "bg-white rounded-2xl border border-gray-200/60 shadow-sm shadow-gray-900/5 hover:shadow-md hover:shadow-gray-900/10 transition-all duration-300",
      className
    )}
  >
    {children}
  </div>
);

export const CardHeader = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn("p-6 border-b border-gray-100/60", className)}>
    {children}
  </div>
);

export const CardContent = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn("p-6", className)}>
    {children}
  </div>
);

export const CardFooter = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn("p-6 border-t border-gray-100/60 bg-gray-50/60 rounded-b-2xl", className)}>
    {children}
  </div>
);
