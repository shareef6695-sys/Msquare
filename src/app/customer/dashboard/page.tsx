import React from 'react';
import { CustomerLayout } from '@/features/customer/CustomerLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { ShieldCheck, FileText, ShoppingBag, Package, MapPin, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function CustomerDashboardPage() {
  return (
    <CustomerLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-gray-900">Account Overview</h1>
        <p className="text-gray-500">Manage your orders and account settings.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Active Orders', value: '2', icon: <ShoppingBag className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600' },
          { label: 'Total Spent', value: '$3,420.50', icon: <Package className="w-5 h-5" />, color: 'bg-green-50 text-green-600' },
          { label: 'Saved Addresses', value: '3', icon: <MapPin className="w-5 h-5" />, color: 'bg-purple-50 text-purple-600' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-xl font-black text-gray-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary-50 border border-primary-200/60 flex items-center justify-center text-primary-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-black text-gray-900">Trade Assurance</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Escrow protection, shipment insurance options, and dispute resolution for safer sourcing.
                  </div>
                </div>
              </div>
              <Link href="/customer/orders" className="text-sm font-semibold text-primary-700 hover:text-primary-800">
                View Orders
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                "Escrow payment protection",
                "LC supported for enterprise orders",
                "Optional shipment insurance",
                "Buyer dispute resolution",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-700">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-black text-gray-900">LC Center</div>
                <div className="text-sm text-gray-500 mt-1">
                  Upload LC documents and track bank status from your orders.
                </div>
              </div>
            </div>
            <Link href="/customer/orders" className="mt-5 block">
              <button className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                Manage LC
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <div className="p-6 border-b border-gray-100/60 flex items-center justify-between">
          <h3 className="text-lg font-black">Recent Orders</h3>
          <Link href="/customer/orders" className="text-primary-700 text-sm font-semibold hover:text-primary-800">
            See All
          </Link>
        </div>
        <div className="p-6 space-y-6">
          {[
            { id: '#ORD-9821', date: 'Oct 20, 2026', status: 'Shipped', total: '$1,200.00', items: 2 },
            { id: '#ORD-9815', date: 'Oct 15, 2026', status: 'Delivered', total: '$85.00', items: 1 },
          ].map((order) => (
            <div key={order.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-gray-200/40 bg-white hover:border-primary-200/70 hover:shadow-sm transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 border border-gray-200/60">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">{order.id}</p>
                  <p className="text-xs text-gray-500">Placed on {order.date} • {order.items} items</p>
                </div>
              </div>
              <div className="flex items-center justify-between md:justify-end gap-8">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    order.status === 'Shipped' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Total</p>
                  <p className="text-sm font-black text-gray-900">{order.total}</p>
                </div>
                <button className="text-gray-400 hover:text-primary-700 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </CustomerLayout>
  );
}
