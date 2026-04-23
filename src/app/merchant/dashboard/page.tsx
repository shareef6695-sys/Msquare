import React from 'react';
import { MerchantLayout } from '@/features/merchant/MerchantLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { 
  TrendingUp, 
  ShoppingBag, 
  Package, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const stats = [
  { label: 'Total Sales', value: '$45,231.89', change: '+12.5%', icon: <TrendingUp className="w-6 h-6" />, color: 'bg-blue-500' },
  { label: 'Total Orders', value: '156', change: '+8.2%', icon: <ShoppingBag className="w-6 h-6" />, color: 'bg-green-500' },
  { label: 'Active Products', value: '42', change: '0%', icon: <Package className="w-6 h-6" />, color: 'bg-purple-500' },
  { label: 'Low Stock', value: '3', change: '-2', icon: <AlertCircle className="w-6 h-6" />, color: 'bg-orange-500' },
];

export default function MerchantDashboardPage() {
  return (
    <MerchantLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500">Welcome back, here’s what’s happening today.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm shadow-gray-900/5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Live store metrics
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl text-white ${stat.color}`}>
                  {stat.icon}
                </div>
                <div className={`flex items-center text-sm font-medium ${
                  stat.change.startsWith('+') ? 'text-green-600' : stat.change === '0%' ? 'text-gray-500' : 'text-red-600'
                }`}>
                  {stat.change}
                  {stat.change.startsWith('+') ? <ArrowUpRight className="w-4 h-4 ml-1" /> : stat.change !== '0%' && <ArrowDownRight className="w-4 h-4 ml-1" />}
                </div>
              </div>
              <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
              <p className="text-2xl font-black text-gray-900 mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Recent Orders</h3>
              <button className="text-primary-600 text-sm font-semibold hover:underline">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Order ID</th>
                    <th className="px-6 py-4 font-semibold">Customer</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { id: '#ORD-7231', customer: 'Alice Johnson', status: 'Processing', amount: '$1,200.00' },
                    { id: '#ORD-7230', customer: 'Bob Smith', status: 'Shipped', amount: '$450.00' },
                    { id: '#ORD-7229', customer: 'Charlie Brown', status: 'Delivered', amount: '$89.00' },
                    { id: '#ORD-7228', customer: 'David Wilson', status: 'Pending', amount: '$2,100.00' },
                  ].map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{order.customer}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'Processing' ? 'bg-blue-50 text-blue-600' :
                          order.status === 'Shipped' ? 'bg-purple-50 text-purple-600' :
                          order.status === 'Delivered' ? 'bg-green-50 text-green-600' :
                          'bg-orange-50 text-orange-600'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{order.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Top Products */}
        <div>
          <Card className="h-full">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold">Top Products</h3>
            </div>
            <div className="p-6 space-y-6">
              {[
                { name: 'Enterprise Server Rack', sales: 12, growth: '+15%' },
                { name: 'Industrial Press', sales: 8, growth: '+10%' },
                { name: 'Smart Lighting', sales: 45, growth: '+25%' },
              ].map((product) => (
                <div key={product.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg" />
                    <div>
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.sales} sales</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                    {product.growth}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </MerchantLayout>
  );
}
