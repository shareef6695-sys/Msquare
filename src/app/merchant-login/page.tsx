import React from 'react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function MerchantLoginPage() {
  return (
    <AuthLayout 
      title="Merchant Login" 
      subtitle="Manage your store and scale your business"
    >
      <form className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email address</label>
          <input 
            type="email" 
            required 
            className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input 
            type="password" 
            required 
            className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input type="checkbox" className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
            <label className="ml-2 block text-sm text-gray-900">Remember me</label>
          </div>
          <Link href="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-500">
            Forgot password?
          </Link>
        </div>

        <Button className="w-full">Sign In as Merchant</Button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">New to MSquare?</span>
          </div>
        </div>
        <div className="mt-6">
          <Link href="/register?role=merchant">
            <Button variant="outline" className="w-full">Create Merchant Account</Button>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
