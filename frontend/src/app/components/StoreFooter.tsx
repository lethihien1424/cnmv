import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import {
  Package,
  Shield,
  Store,
  Truck,
  X,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';

const footerFeatures = [
  {
    icon: Truck,
    title: 'Miễn phí vận chuyển',
    description: 'Cho đơn hàng trên 500K',
  },
  {
    icon: Shield,
    title: 'Thanh toán an toàn',
    description: 'Bảo mật 100%',
  },
  {
    icon: Package,
    title: 'Đổi trả dễ dàng',
    description: 'Trong vòng 30 ngày',
  },
  {
    icon: Store,
    title: 'Hỗ trợ 24/7',
    description: 'Luôn sẵn sàng hỗ trợ',
  },
];

type ModalType = 'about' | 'terms' | 'privacy' | null;

export default function StoreFooter() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const handleOpenChat = (e: React.MouseEvent) => {
    e.preventDefault();

    window.dispatchEvent(
      new CustomEvent('toggle-chat', {
        detail: { open: true },
      })
    );
  };

  const modalContent = {
    about: (
      <>
        <h3 className="text-base font-bold text-slate-900">
          ShopHub - Kết nối mọi nhu cầu mua sắm
        </h3>

        <p>
          ShopHub là nền tảng thương mại điện tử hiện đại kết nối người mua và
          người bán trên toàn quốc. Chúng tôi cung cấp môi trường giao dịch trực
          tuyến an toàn, minh bạch và thuận tiện.
        </p>

        <p>
          Với hàng nghìn sản phẩm thuộc nhiều ngành hàng khác nhau như thời
          trang, điện tử, gia dụng, mỹ phẩm và phụ kiện, ShopHub giúp khách hàng
          dễ dàng tìm kiếm và lựa chọn sản phẩm phù hợp.
        </p>

        <p>
          Chúng tôi không ngừng cải tiến công nghệ nhằm mang đến trải nghiệm mua
          sắm trực tuyến tốt nhất cho người dùng.
        </p>

        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
          <h4 className="mb-2 font-semibold text-cyan-800">
            Thông tin liên hệ
          </h4>

          <div className="space-y-2 text-sm">
            <p>📍 12 Nguyễn Văn Bảo, Gò Vấp, TP.HCM</p>
            <p>📞 1900 1234</p>
            <p>✉️ support@shophub.vn</p>
            <p>🕒 Hỗ trợ 24/7</p>
          </div>
        </div>
      </>
    ),

    terms: (
      <>
        <h3 className="text-base font-bold text-slate-900">
          Điều khoản sử dụng
        </h3>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">
              1. Chấp nhận điều khoản
            </h4>
            <p>
              Khi truy cập hoặc sử dụng ShopHub, người dùng đồng ý tuân thủ toàn
              bộ điều khoản và chính sách được công bố trên hệ thống.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">
              2. Tài khoản người dùng
            </h4>
            <p>
              Người dùng chịu trách nhiệm bảo mật tài khoản, mật khẩu và mọi
              hoạt động phát sinh từ tài khoản của mình.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">
              3. Sản phẩm và nội dung
            </h4>

            <ul className="list-disc space-y-1 pl-5">
              <li>Không đăng bán hàng giả, hàng nhái.</li>
              <li>Không đăng tải nội dung vi phạm pháp luật.</li>
              <li>Không sử dụng thông tin sai lệch để lừa đảo.</li>
              <li>Không xâm phạm quyền sở hữu trí tuệ.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">
              4. Thanh toán
            </h4>
            <p>
              Người mua có trách nhiệm thanh toán đầy đủ giá trị đơn hàng theo
              phương thức đã lựa chọn.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">
              5. Quyền của ShopHub
            </h4>
            <p>
              ShopHub có quyền từ chối hoặc khóa tài khoản vi phạm điều khoản sử
              dụng mà không cần báo trước.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">
              6. Thay đổi điều khoản
            </h4>
            <p>
              Điều khoản có thể được cập nhật theo từng thời điểm. Việc tiếp tục
              sử dụng dịch vụ đồng nghĩa với việc chấp nhận các thay đổi đó.
            </p>
          </div>
        </div>
      </>
    ),

    privacy: (
      <>
        <h3 className="text-base font-bold text-slate-900">
          Chính sách bảo mật
        </h3>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">
              1. Thông tin thu thập
            </h4>
            <p>
              Chúng tôi có thể thu thập họ tên, email, số điện thoại, địa chỉ,
              thông tin giao hàng và lịch sử giao dịch.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">
              2. Mục đích sử dụng
            </h4>

            <ul className="list-disc space-y-1 pl-5">
              <li>Xử lý đơn hàng.</li>
              <li>Hỗ trợ khách hàng.</li>
              <li>Nâng cao chất lượng dịch vụ.</li>
              <li>Phòng chống gian lận.</li>
              <li>Gửi thông báo liên quan đến tài khoản.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">
              3. Bảo vệ dữ liệu
            </h4>
            <p>
              ShopHub áp dụng các biện pháp kỹ thuật và quản lý nhằm bảo vệ dữ
              liệu khỏi truy cập trái phép hoặc rò rỉ thông tin.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">
              4. Chia sẻ dữ liệu
            </h4>
            <p>
              Chúng tôi không bán thông tin cá nhân cho bên thứ ba, ngoại trừ
              trường hợp pháp luật yêu cầu hoặc phục vụ vận chuyển, thanh toán.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">
              5. Quyền của người dùng
            </h4>
            <p>
              Người dùng có quyền xem, chỉnh sửa hoặc yêu cầu xóa thông tin cá
              nhân của mình.
            </p>
          </div>

          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
            <h4 className="mb-2 font-semibold text-cyan-800">
              Liên hệ bảo mật
            </h4>

            <p>Email: support@shophub.vn</p>
            <p>Hotline: 1900 1234</p>
          </div>
        </div>
      </>
    ),
  };

  return (
    <footer className="mt-4 w-full border-t border-cyan-100 bg-gradient-to-b from-cyan-50 to-white text-slate-700 shadow-inner">
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {footerFeatures.map((feature) => (
            <div
              key={feature.title}
              className="flex gap-3 rounded-xl border border-cyan-100 bg-white p-4"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
                <feature.icon className="size-5" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {feature.title}
                </h3>

                <p className="text-xs text-slate-500">
                  {feature.description}
                </p>
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

              <span className="text-lg font-bold text-slate-900">
                ShopHub
              </span>
            </div>

            <p className="text-sm leading-relaxed text-slate-500">
              Nền tảng mua sắm trực tuyến hàng đầu.
            </p>

            <div className="mt-3 space-y-2 text-sm text-slate-500">
              <p className="flex items-center gap-2">
                <MapPin size={14} />
                12 Nguyễn Văn Bảo, TP.HCM
              </p>

              <p className="flex items-center gap-2">
                <Phone size={14} />
                1900 1234
              </p>

              <p className="flex items-center gap-2">
                <Mail size={14} />
                support@shophub.vn
              </p>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-slate-900">
              Về chúng tôi
            </h4>

            <ul className="space-y-3 text-sm text-slate-500">
              <li>
                <button
                  onClick={() => setActiveModal('about')}
                  className="hover:text-cyan-600"
                >
                  Giới thiệu
                </button>
              </li>

              <li>
                <button
                  onClick={() => setActiveModal('terms')}
                  className="hover:text-cyan-600"
                >
                  Điều khoản
                </button>
              </li>

              <li>
                <button
                  onClick={() => setActiveModal('privacy')}
                  className="hover:text-cyan-600"
                >
                  Chính sách bảo mật
                </button>
              </li>
            </ul>
          </div>

<div>
  <h4 className="mb-4 font-semibold text-slate-900">
    THEO DÕI SHOPHUB
  </h4>

  <ul className="space-y-3 text-sm text-slate-500">
    <li>
      <a
        href="https://www.facebook.com/?locale=vi_VN"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-cyan-600 transition-colors"
      >
        Facebook
      </a>
    </li>

    <li>
      <a
        href="https://www.instagram.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-cyan-600 transition-colors"
      >
        Instagram
      </a>
    </li>

    <li>
      <a
        href="https://www.tiktok.com/vi-VN/"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-cyan-600 transition-colors"
      >
        TikTok
      </a>
    </li>
  </ul>
</div>


          <div>
            <h4 className="mb-4 font-semibold text-slate-900">
              Thanh toán
            </h4>

            <div className="grid grid-cols-3 gap-2">
              {['VISA', 'MC', 'MOMO', 'ZP', 'COD', 'ATM'].map((method) => (
                <div
                  key={method}
                  className="flex items-center justify-center rounded-md border border-cyan-200 bg-white px-2 py-2.5 text-center text-[11px] font-semibold text-cyan-800 shadow-sm"
                >
                  {method}
                </div>
              ))}
            </div>
          </div>
        </div>

        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b bg-cyan-50 px-6 py-4">
                <h2 className="text-lg font-bold text-cyan-900">
                  {activeModal === 'about'
                    ? 'Giới thiệu về ShopHub'
                    : activeModal === 'terms'
                    ? 'Điều khoản sử dụng'
                    : 'Chính sách bảo mật'}
                </h2>

                <button
                  onClick={() => setActiveModal(null)}
                  className="rounded-full p-1 hover:bg-cyan-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="custom-scrollbar space-y-4 overflow-y-auto p-6 text-sm leading-relaxed text-slate-700">
                {modalContent[activeModal]}
              </div>

              <div className="flex justify-end border-t p-4">
                <Button
                  onClick={() => setActiveModal(null)}
                  className="rounded-lg bg-cyan-600 text-white hover:bg-cyan-700"
                >
                  Đã hiểu
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 border-t border-cyan-200 pt-6 text-center text-sm text-slate-500">
          © 2026 ShopHub. Tất cả quyền được bảo lưu.
        </div>
      </div>
    </footer>
  );
}

