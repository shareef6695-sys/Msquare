import React from 'react';
import { CustomerLayout } from '@/features/customer/CustomerLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { ShoppingBag, Package, MapPin, Clock, ChevronRight } from 'lucide-react';

export default function CustomerDashboardPage() {
  return (
    <CustomerLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Account Overview</h1>
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
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold">Recent Orders</h3>
          <button className="text-primary-600 text-sm font-semibold hover:underline">See All</button>
        </div>
        <div className="p-6 space-y-6">
          {[
            { id: '#ORD-9821', date: 'Oct 20, 2026', status: 'Shipped', total: '$1,200.00', items: 2 },
            { id: '#ORD-9815', date: 'Oct 15, 2026', status: 'Delivered', total: '$85.00', items: 1 },
          ].map((order) => (
            <div key={order.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-gray-50 hover:border-primary-100 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{order.id}</p>
                  <p className="text-xs text-gray-500">Placed on {order.date} • {order.items} items</p>
                </div>
              </div>
              <div className="flex items-center justify-between md:justify-end gap-8">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.status === 'Shipped' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Total</p>
                  <p className="text-sm font-bold text-gray-900">{order.total}</p>
                </div>
                <button className="text-gray-400 hover:text-primary-600 transition-colors">
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
