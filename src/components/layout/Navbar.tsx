"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, Search, Store, UserRound, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useRouter } from "next/navigation";
import { 
  NAV_LINKS, 
  MERCHANT_LOGIN_URL, 
  CUSTOMER_LOGIN_URL, 
  GET_STARTED_URL 
} from '@/constants/links';

export const Navbar = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/60 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-600/20">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
              MSquare
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/marketplace"
              className="text-sm font-semibold text-gray-900 hover:text-primary-700 transition-colors"
            >
              Marketplace
            </Link>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="ml-2 hidden lg:flex items-center gap-2 rounded-full border border-gray-200/60 bg-white px-4 py-2 shadow-sm shadow-gray-900/5">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const q = query.trim();
                    router.push(q ? `/marketplace?q=${encodeURIComponent(q)}` : "/marketplace");
                  }
                }}
                placeholder="Search products, suppliers…"
                className="w-64 bg-transparent text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none"
              />
              <button
                type="button"
                className="text-xs font-black text-primary-700 hover:text-primary-800"
                onClick={() => {
                  const q = query.trim();
                  router.push(q ? `/marketplace?q=${encodeURIComponent(q)}` : "/marketplace");
                }}
              >
                Search
              </button>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <Link href={MERCHANT_LOGIN_URL}>
              <Button variant="outline" size="sm" className="gap-2">
                <Store className="w-4 h-4" />
                Merchant Login
              </Button>
            </Link>
            <Link href={CUSTOMER_LOGIN_URL}>
              <Button variant="outline" size="sm" className="gap-2">
                <UserRound className="w-4 h-4" />
                Customer Login
              </Button>
            </Link>
            <Link href={GET_STARTED_URL}>
              <Button size="sm" className="gap-2">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-4">
            <button
              className="text-gray-700 hover:text-gray-900 transition-colors"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-gray-900 transition-colors"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-200/60 shadow-xl p-4 flex flex-col gap-4 animate-in slide-in-from-top duration-300">
          <Link
            href="/marketplace"
            className="text-base font-semibold text-gray-900 p-2 hover:bg-gray-50 rounded-xl"
            onClick={() => setIsOpen(false)}
          >
            Marketplace
          </Link>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-base font-medium text-gray-700 p-2 hover:bg-gray-50 rounded-xl"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <hr className="border-gray-100" />
          <div className="flex flex-col gap-3">
            <Link href={MERCHANT_LOGIN_URL} className="w-full">
              <Button variant="outline" className="w-full gap-2" onClick={() => setIsOpen(false)}>
                <Store className="w-4 h-4" />
                Merchant Login
              </Button>
            </Link>
            <Link href={CUSTOMER_LOGIN_URL} className="w-full">
              <Button variant="outline" className="w-full gap-2" onClick={() => setIsOpen(false)}>
                <UserRound className="w-4 h-4" />
                Customer Login
              </Button>
            </Link>
            <Link href={GET_STARTED_URL} className="w-full">
              <Button className="w-full gap-2" onClick={() => setIsOpen(false)}>
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {searchOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-24 md:hidden">
          <button className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setSearchOpen(false)} aria-label="Close" />
          <div className="relative w-full max-w-lg rounded-3xl border border-gray-200/60 bg-white shadow-xl shadow-gray-900/20">
            <div className="p-5 border-b border-gray-100/60 flex items-center justify-between">
              <div className="text-sm font-black text-gray-900">Search</div>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setSearchOpen(false)} aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3 rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const q = query.trim();
                      router.push(q ? `/marketplace?q=${encodeURIComponent(q)}` : "/marketplace");
                      setSearchOpen(false);
                    }
                  }}
                  placeholder="Search products, suppliers, categories…"
                  className="w-full bg-transparent text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
              <Button
                className="w-full mt-4"
                onClick={() => {
                  const q = query.trim();
                  router.push(q ? `/marketplace?q=${encodeURIComponent(q)}` : "/marketplace");
                  setSearchOpen(false);
                }}
              >
                Search Marketplace
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
