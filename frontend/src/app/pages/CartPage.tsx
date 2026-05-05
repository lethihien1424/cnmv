//D:\CongNgheMoi-hien\CongNgheMoi\frontend\src\app\pages\CartPage.tsx
import { useState } from "react";
import CartDrawer from "../components/CartDrawer";

export default function CartPage() {
  const [open, setOpen] = useState(true);

  return (
    <CartDrawer
      isOpen={open}
      onClose={() => setOpen(false)}
    />
  );
}