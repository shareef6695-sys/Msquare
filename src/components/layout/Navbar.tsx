"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ShoppingCart, User, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { 
  NAV_LINKS, 
  MERCHANT_LOGIN_URL, 
  CUSTOMER_LOGIN_URL, 
  GET_STARTED_URL 
} from '@/constants/links';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
              MSquare
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link href={MERCHANT_LOGIN_URL}>
              <Button variant="ghost" size="sm">Merchant Login</Button>
            </Link>
            <Link href={CUSTOMER_LOGIN_URL}>
              <Button variant="ghost" size="sm">Customer Login</Button>
            </Link>
            <Link href={GET_STARTED_URL}>
              <Button size="sm">Get Started</Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-4">
            <button className="text-gray-600">
              <Search className="w-5 h-5" />
            </button>
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-600">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-t border-gray-100 shadow-xl p-4 flex flex-col gap-4 animate-in slide-in-from-top duration-300">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-base font-medium text-gray-600 p-2 hover:bg-gray-50 rounded-lg"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <hr className="border-gray-100" />
          <div className="flex flex-col gap-3">
            <Link href={MERCHANT_LOGIN_URL} className="w-full">
              <Button variant="outline" className="w-full" onClick={() => setIsOpen(false)}>Merchant Login</Button>
            </Link>
            <Link href={CUSTOMER_LOGIN_URL} className="w-full">
              <Button variant="outline" className="w-full" onClick={() => setIsOpen(false)}>Customer Login</Button>
            </Link>
            <Link href={GET_STARTED_URL} className="w-full">
              <Button className="w-full" onClick={() => setIsOpen(false)}>Get Started</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
