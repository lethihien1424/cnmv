// frontend/src/app/pages/StoreSettingsPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AddressDropdown from './AddressDropdown';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { MapPin, Map as MapIcon, CheckCircle, Loader2 } from 'lucide-react';

// ─── Inline Leaflet map for store location ────────────────────────────────────
interface StoreMapPickerProps {
  initLat?: number | null;
  initLng?: number | null;

  autoLocation?: {
    lat: number;
    lng: number;
  } | null;

  onConfirm: (lat: number, lng: number) => void;
}

const StoreMapPicker: React.FC<StoreMapPickerProps> = ({
  initLat,
  initLng,
  autoLocation,
  onConfirm
}) => {
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [pos, setPos] = useState({
    lat: initLat ? Number(initLat) : 10.7769,
    lng: initLng ? Number(initLng) : 106.7009,
  });
  const [confirmed, setConfirmed] = useState(!!(initLat && initLng));
useEffect(() => {

  if (
    !mapInstance.current ||
    !autoLocation
  ) return;

  const map = mapInstance.current;

  map.flyTo(
  [autoLocation.lat, autoLocation.lng],
  16,
  {
    duration: 1.2,
  }
);

if (markerRef.current) {

  markerRef.current.setLatLng([
    autoLocation.lat,
    autoLocation.lng,
  ]);
}

setPos({
  lat: autoLocation.lat,
  lng: autoLocation.lng,
});

}, [autoLocation]);
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const init = async () => {
      if (!(window as any).L) {
        await new Promise<void>((res) => {
          const s = document.createElement('script');
          s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          s.onload = () => res();
          document.head.appendChild(s);
        });
      }
      const L = (window as any).L;
      const sLat = initLat ? Number(initLat) : 10.7769;
      const sLng = initLng ? Number(initLng) : 106.7009;

      const map = L.map(mapRef.current).setView([sLat, sLng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;
          background:linear-gradient(135deg,#7c3aed,#4f46e5);transform:rotate(-45deg);
          border:3px solid #fff;box-shadow:0 2px 10px rgba(124,58,237,0.5)"></div>`,
        iconSize: [32, 32], iconAnchor: [16, 32],
      });

      const marker = L.marker([sLat, sLng], { draggable: true, icon }).addTo(map);
      markerRef.current = marker;
      marker.on('dragend', (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        setPos({ lat, lng }); setConfirmed(false);
      });
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setPos({ lat, lng }); setConfirmed(false);
      });

      mapInstance.current = map;
    };

    init();
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  const handleOk = () => {
    setConfirmed(true);
    onConfirm(pos.lat, pos.lng);
  };

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '2px solid #ede9fe', marginTop: 12 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <MapIcon size={14} color="#fff" />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
          Vị trí kho / cửa hàng
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginLeft: 4 }}>
          — dùng để tính phí vận chuyển
        </span>
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ height: 300, width: '100%' }} />

      {/* Coord bar + OK */}
      <div style={{
        padding: '10px 14px', background: '#faf5ff',
        borderTop: '1px solid #ede9fe',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>📐</span>
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#7c3aed', fontWeight: 600, flex: 1 }}>
          {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
        </span>
        <button
          onClick={handleOk}
          style={{
            padding: '7px 18px', border: 'none', borderRadius: 10, cursor: 'pointer',
            background: confirmed
              ? 'linear-gradient(135deg,#16a34a,#15803d)'
              : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
            color: '#fff', fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 5, transition: 'all .2s',
          }}
        >
          {confirmed ? <><CheckCircle size={13} /> Đã xác nhận</> : '✓ OK'}
        </button>
      </div>
    </div>
  );
};

// ─── StoreSettingsPage ────────────────────────────────────────────────────────
const StoreSettingsPage = () => {
  const { updateStore } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showMap, setShowMap]     = useState(false);
const [autoLocation, setAutoLocation] = useState<{
  lat: number;
  lng: number;
} | null>(null);
const geocodeTimeout = useRef<any>(null);
  const [formData, setFormData] = useState({
    store_name: '',
    description: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });
const autoLocateAddress = (
  fullAddress: string
) => {

  if (!fullAddress) return;

  // clear request cũ
  if (geocodeTimeout.current) {
    clearTimeout(
      geocodeTimeout.current
    );
  }

  // debounce
  geocodeTimeout.current =
    setTimeout(async () => {

      try {

        const res = await fetch(
          `/api/geocode/search?query=${encodeURIComponent(fullAddress)}`
        );

        const json =
          await res.json();

        if (json.success) {

          const lat =
            Number(json.data.lat);

          const lng =
            Number(json.data.lng);

          setAutoLocation({
            lat,
            lng,
          });
        }

      } catch (err) {

        console.error(err);
      }

    }, 700);
};
  // ── Load current store info ───────────────────────────────────────────────
  useEffect(() => {
    const fetchStore = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/stores/my-store', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const s = res.data.data;
        if (s) {
          setFormData({
            store_name:    s.store_name    || '',
            description:   s.description  || '',
            contact_phone: s.contact_phone || '',
            contact_email: s.contact_email || '',
            address:       s.address      || '',
            latitude:      s.latitude     ? Number(s.latitude)  : null,
            longitude:     s.longitude    ? Number(s.longitude) : null,
          });
          // Auto-show map if no coords yet
          if (!s.latitude || !s.longitude) setShowMap(true);
        }
      } catch (e) {
        console.error('Lỗi tải thông tin cửa hàng:', e);
      }
    };
    fetchStore();
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.store_name.trim()) { toast.error('Tên cửa hàng không được để trống'); return; }
    if (!formData.latitude || !formData.longitude) {
      toast.error('Vui lòng xác nhận vị trí cửa hàng trên bản đồ (nhấn ✓ OK)');
      setShowMap(true);
      return;
    }

    setIsLoading(true);
    try {
      await (updateStore as (data: any) => Promise<void>)({
        store_name:    formData.store_name,
        description:   formData.description,
        contact_phone: formData.contact_phone,
        contact_email: formData.contact_email,
        address:       formData.address,
        latitude:      formData.latitude,
        longitude:     formData.longitude,
      });
      toast.success('Đã cập nhật thông tin cửa hàng');
    } catch (err: any) {
      toast.error(err.message || 'Cập nhật thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const hasCoords = !!(formData.latitude && formData.longitude);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 16px' }}>
      <div style={{
        background: '#fff', borderRadius: 20,
        border: '1.5px solid #f0f0f0',
        boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
          padding: '20px 28px',
        }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-.3px' }}>
            Thiết lập Cửa hàng
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
            Cập nhật thông tin và vị trí để hệ thống tính phí ship chính xác
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Store name */}
          <div>
            <label style={labelStyle}>Tên cửa hàng *</label>
            <Input
              value={formData.store_name}
              onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
              placeholder="Nhập tên shop..."
            />
          </div>

          {/* Email + Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Email liên hệ</label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label style={labelStyle}>Số điện thoại</label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="0901234567"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Mô tả cửa hàng</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Mô tả về cửa hàng của bạn..."
              rows={3}
            />
          </div>

          {/* Address section */}
          <div style={{
            padding: '16px', borderRadius: 14,
            background: '#faf5ff', border: '1.5px solid #ede9fe',
          }}>
            <label style={{ ...labelStyle, color: '#7c3aed', marginBottom: 8 }}>
              📦 Địa chỉ lấy hàng / kho
            </label>

            {/* Current address display */}
            <div style={{
              fontSize: 13, color: '#374151', fontStyle: 'italic',
              padding: '8px 12px', background: '#fff',
              borderRadius: 8, border: '1px solid #e9d5ff', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <MapPin size={13} color="#7c3aed" />
              {formData.address || 'Chưa cập nhật địa chỉ'}
            </div>

            {/* Coordinates status */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8,
              background: hasCoords ? '#f0fdf4' : '#fff7ed',
              border: `1px solid ${hasCoords ? '#bbf7d0' : '#fed7aa'}`,
              marginBottom: 12, fontSize: 12,
            }}>
              {hasCoords ? (
                <>
                  <CheckCircle size={13} color="#16a34a" />
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>
                    Tọa độ đã xác nhận: {formData.latitude?.toFixed(5)}, {formData.longitude?.toFixed(5)}
                  </span>
                </>
              ) : (
                <>
                  <span style={{ color: '#ea580c', fontWeight: 600 }}>
                    ⚠ Chưa có tọa độ — cần ghim bản đồ để tính phí ship
                  </span>
                </>
              )}
            </div>

            <label style={{ ...labelStyle, marginBottom: 8 }}>Cập nhật địa chỉ:</label>
            <AddressDropdown
  onLocationSearch={autoLocateAddress}
            onAddressChange={(fullAddress: string) => {

                setFormData((prev) => ({
                  ...prev,
                  address: fullAddress,
                }));

                autoLocateAddress(fullAddress);
              }}
            />

            {/* Toggle map */}
            <button
              type="button"
              onClick={() => setShowMap((v) => !v)}
              style={{
                marginTop: 12,
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 700,
                padding: '7px 16px', borderRadius: 8,
                background: showMap ? '#f5f3ff' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                color: showMap ? '#7c3aed' : '#fff',
                border: showMap ? '1.5px solid #ede9fe' : 'none',
                cursor: 'pointer', transition: 'all .2s',
              }}
            >
              <MapIcon size={13} />
              {showMap ? 'Ẩn bản đồ' : hasCoords ? 'Cập nhật vị trí trên bản đồ' : 'Ghim vị trí trên bản đồ'}
            </button>

            {showMap && (
              <StoreMapPicker
                initLat={formData.latitude}
                initLng={formData.longitude}
                autoLocation={autoLocation}
                onConfirm={(lat, lng) => {
                  setFormData((prev) => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                  }));
                }}
              />
              
            )}
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '12px 32px',
                background: isLoading
                  ? '#a5b4fc'
                  : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                border: 'none', borderRadius: 12,
                color: '#fff', fontWeight: 700, fontSize: 15,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all .2s',
              }}
            >
              {isLoading
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Đang lưu...</>
                : 'Lưu thay đổi'
              }
            </button>
          </div>

        </form>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: '#374151', marginBottom: 6,
};

export default StoreSettingsPage;