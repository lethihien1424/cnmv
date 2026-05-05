import React from 'react';
import { Link } from 'react-router';
import { Button } from './ui/button';
import { Package, Shield, Store, Truck } from 'lucide-react';

const footerFeatures = [
  { icon: Truck, title: 'Miễn phí vận chuyển', description: 'Cho đơn hàng trên 500K' },
  { icon: Shield, title: 'Thanh toán an toàn', description: 'Bảo mật 100%' },
  { icon: Package, title: 'Đổi trả dễ dàng', description: 'Trong vòng 30 ngày' },
  { icon: Store, title: 'Hỗ trợ 24/7', description: 'Luôn sẵn sàng hỗ trợ' },
];

export default function StoreFooter() {
  return (
    <footer className="w-full mt-4 border-t border-cyan-100 bg-gradient-to-b from-cyan-50 to-white text-slate-700 shadow-inner">
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {footerFeatures.map((feature) => (
            <div key={feature.title} className="flex gap-3 rounded-xl border border-cyan-100 bg-white p-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
                <feature.icon className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{feature.title}</h3>
                <p className="text-xs text-slate-500">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm">
                <Store className="size-4" />
              </div>
              <span className="text-lg font-bold text-slate-900">ShopHub</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">Nền tảng mua sắm trực tuyến phù hợp với giao diện cyan/blue hiện tại.</p>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="icon" className="bg-white border-cyan-200 text-cyan-700 hover:bg-cyan-50">f</Button>
              <Button variant="outline" size="icon" className="bg-white border-cyan-200 text-cyan-700 hover:bg-cyan-50">in</Button>
              <Button variant="outline" size="icon" className="bg-white border-cyan-200 text-cyan-700 hover:bg-cyan-50">tw</Button>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-slate-900">Về chúng tôi</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><Link to="/" className="hover:text-cyan-600 transition-colors">Giới thiệu</Link></li>
              <li><Link to="/" className="hover:text-cyan-600 transition-colors">Điều khoản</Link></li>
              <li><Link to="/" className="hover:text-cyan-600 transition-colors">Chính sách bảo mật</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-slate-900">Hỗ trợ</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><Link to="/" className="hover:text-cyan-600 transition-colors">Trung tâm hỗ trợ</Link></li>
              <li><Link to="/" className="hover:text-cyan-600 transition-colors">Liên hệ</Link></li>
              <li><Link to="/" className="hover:text-cyan-600 transition-colors">An toàn mua bán</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-slate-900">Thanh toán</h4>
            <div className="grid grid-cols-3 gap-2">
              {['VISA', 'MC', 'MOMO', 'ZP', 'COD', 'ATM'].map((method) => (
                <div key={method} className="flex items-center justify-center rounded-md border border-cyan-200 bg-white px-2 py-2.5 text-center text-[11px] font-semibold text-cyan-800 shadow-sm">
                  {method}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-cyan-200 pt-6 text-center text-sm text-slate-500">
          &copy; 2026 ShopHub. Tất cả quyền được bảo lưu.
        </div>
      </div>
    </footer>
  );
}
