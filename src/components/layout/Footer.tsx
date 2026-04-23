import React from 'react';
import Link from 'next/link';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className="text-2xl font-bold text-white">MSquare</span>
            </Link>
            <p className="text-gray-400 leading-relaxed">
              The world's leading B2B/B2C marketplace for industrial equipment, fashion, electronics, and more.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-primary-500 transition-colors"><Facebook className="w-5 h-5" /></a>
              <a href="#" className="hover:text-primary-500 transition-colors"><Twitter className="w-5 h-5" /></a>
              <a href="#" className="hover:text-primary-500 transition-colors"><Instagram className="w-5 h-5" /></a>
              <a href="#" className="hover:text-primary-500 transition-colors"><Linkedin className="w-5 h-5" /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-6">Solutions</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="hover:text-primary-500 transition-colors">For Merchants</Link></li>
              <li><Link href="#" className="hover:text-primary-500 transition-colors">For Customers</Link></li>
              <li><Link href="#" className="hover:text-primary-500 transition-colors">Supply Chain</Link></li>
              <li><Link href="#" className="hover:text-primary-500 transition-colors">Logistics</Link></li>
              <li><Link href="#" className="hover:text-primary-500 transition-colors">Enterprise</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-bold mb-6">Support</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="hover:text-primary-500 transition-colors">Help Center</Link></li>
              <li><Link href="#" className="hover:text-primary-500 transition-colors">Contact Us</Link></li>
              <li><Link href="#" className="hover:text-primary-500 transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-primary-500 transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-primary-500 transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-6">Get in Touch</h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary-500" />
                <span>support@msquare.com</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary-500" />
                <span>+1 (555) 000-0000</span>
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary-500" />
                <span>123 Commerce St, New York, NY 10001</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>© 2026 MSquare. All rights reserved.</p>
          <div className="flex gap-8">
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
            <Link href="#" className="hover:text-white transition-colors">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
