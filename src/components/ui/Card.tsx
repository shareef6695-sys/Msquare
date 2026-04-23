import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300", className)}>
    {children}
  </div>
);

export const CardHeader = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn("p-6 border-b border-gray-50", className)}>
    {children}
  </div>
);

export const CardContent = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn("p-6", className)}>
    {children}
  </div>
);

export const CardFooter = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn("p-6 border-t border-gray-50 bg-gray-50/50 rounded-b-2xl", className)}>
    {children}
  </div>
);
