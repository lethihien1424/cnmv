//frontend/src/app/components/AddressSelector.tsx
import React, { useState, useEffect, useRef } from 'react';
import { addressService, UserAddress } from '../services/addressService';
import { ghnService, GHNProvince, GHNDistrict, GHNWard } from '../services/ghnService';
import { apiRequest } from '../services/api';
import { toast } from 'sonner';
import {
  MapPin, Plus, CheckCircle, Loader2, ChevronDown, X, Map as MapIcon
} from 'lucide-react';

interface AddressSelectorProps {
  selectedId: string | null;
  onSelect: (addressId: string, addressObj?: UserAddress) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaflet map component (inline, not a modal)
// ─────────────────────────────────────────────────────────────────────────────
interface InlineMapProps {
  initLat?: number | null;
  initLng?: number | null;

  autoLat?: number | null;
  autoLng?: number | null;

  onConfirm: (lat: number, lng: number) => void;
}

const InlineMap: React.FC<InlineMapProps> = ({
  initLat,
  initLng,
  autoLat,
  autoLng,
  onConfirm
}) => {
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef   = useRef<any>(null);
  const [pos, setPos] = useState({
    lat: initLat ? Number(initLat) : 10.7769,
    lng: initLng ? Number(initLng) : 106.7009,
  });
  const [confirmed, setConfirmed] = useState(false);
useEffect(() => {
  if (
    !mapInstance.current ||
    !markerRef.current ||
    autoLat == null ||
    autoLng == null
  ) return;

  const map = mapInstance.current;

  map.flyTo([autoLat, autoLng], 16, {
    duration: 1.2,
  });

  markerRef.current.setLatLng([autoLat, autoLng]);

  setPos({
    lat: autoLat,
    lng: autoLng,
  });

  setConfirmed(false);

}, [autoLat, autoLng]);
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Leaflet CSS
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
      const startLat = initLat ? Number(initLat) : 10.7769;
      const startLng = initLng ? Number(initLng) : 106.7009;

      const map = L.map(mapRef.current).setView([startLat, startLng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;
          background:linear-gradient(135deg,#6366f1,#8b5cf6);transform:rotate(-45deg);
          border:3px solid #fff;box-shadow:0 2px 10px rgba(99,102,241,0.5)"></div>`,
        iconSize: [32, 32], iconAnchor: [16, 32],
      });

      const marker = L.marker([startLat, startLng], { draggable: true, icon }).addTo(map);
      markerRef.current = marker;

      marker.on('dragend', (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        setPos({ lat, lng });
        setConfirmed(false);
      });

      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setPos({ lat, lng });
        setConfirmed(false);
      });

      mapInstance.current = map;
    };

    init();
    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, []);

  const handleOk = () => {
    setConfirmed(true);
    onConfirm(pos.lat, pos.lng);
  };

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '2px solid #e0e7ff', marginTop: 12 }}>
      {/* Map header */}
      <div style={{
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <MapIcon size={14} color="#fff" />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
          Ghim vị trí chính xác
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginLeft: 4 }}>
          — kéo điểm đánh dấu hoặc click bản đồ
        </span>
      </div>

      {/* Map canvas */}
      <div ref={mapRef} style={{ height: 280, width: '100%' }} />

      {/* Coordinate bar + OK */}
      <div style={{
        padding: '10px 14px',
        background: '#f8faff',
        borderTop: '1px solid #e0e7ff',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>📐</span>
        <span style={{
          fontSize: 12, fontFamily: 'monospace', color: '#4f46e5', fontWeight: 600, flex: 1,
        }}>
          {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
        </span>
        <button
          onClick={handleOk}
          style={{
            padding: '7px 18px',
            background: confirmed
              ? 'linear-gradient(135deg,#16a34a,#15803d)'
              : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border: 'none', borderRadius: 10,
            color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s',
          }}
        >
          {confirmed ? <><CheckCircle size={13} /> Đã xác nhận</> : '✓ OK'}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const AddressSelector: React.FC<AddressSelectorProps> = ({ selectedId, onSelect }) => {
  const [addresses, setAddresses]   = useState<UserAddress[]>([]);
  const [loading, setLoading]       = useState(true);
  const [isChoosing, setIsChoosing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // GHN data
  const [provinces, setProvinces] = useState<GHNProvince[]>([]);
  const [districts, setDistricts] = useState<GHNDistrict[]>([]);
  const [wards, setWards]         = useState<GHNWard[]>([]);

  // Form
  const [form, setForm] = useState({
    recipient_name: '', phone: '', detail: '',
    province_id: 0, province_name: '',
    district_id: 0, district_name: '',
    ward_code: '', ward_name: '',
    is_default: false,
  });

  // Map coords captured from InlineMap
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);
const [autoLocation, setAutoLocation] = useState<{
  lat: number;
  lng: number;
} | null>(null);
const updateMapByAddress = async (
  provinceName: string,
  districtName?: string,
  wardName?: string
) => {

  try {

    const query = [
      wardName,
      districtName,
      provinceName,
      "Vietnam"
    ]
      .filter(Boolean)
      .join(", ");

    const res = await fetch(
  `/api/geocode/search?query=${encodeURIComponent(query)}`
);

const json = await res.json();

if (json.success) {

  const lat = Number(json.data.lat);
  const lng = Number(json.data.lng);

  setAutoLocation({
    lat,
    lng,
  });
}

    const data = await res.json();

    if (data?.length) {

      const lat = Number(data[0].lat);
      const lng = Number(data[0].lon);

      setAutoLocation({
        lat,
        lng,
      });
    }

  } catch (err) {

    console.error("Map update failed", err);
  }
};

  // ── Load data ───────────────────────────────────────
  useEffect(() => { loadAddresses(); loadProvinces(); }, []);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const data = await addressService.getAddresses();
      setAddresses(data || []);
      if (!selectedId && data?.length) {
        const def = data.find((a) => a.is_default) || data[0];
        onSelect(def.id, def);
      }
    } catch { toast.error('Không thể tải danh sách địa chỉ'); }
    finally { setLoading(false); }
  };

  const loadProvinces = async () => {
    try { setProvinces(await ghnService.getProvinces()); }
    catch (e) { console.error(e); }
  };

  const handleProvinceChange = async (id: string) => {

  const pid = parseInt(id);

  const prov =
    provinces.find(
      (p) => p.ProvinceID === pid
    );

  setForm((f) => ({
    ...f,
    province_id: pid,
    province_name: prov?.ProvinceName || '',
    district_id: 0,
    ward_code: '',
    district_name: '',
    ward_name: '',
  }));

  setDistricts([]);
  setWards([]);

  try {

    setDistricts(
      await ghnService.getDistricts(pid)
    );

    await updateMapByAddress(
      prov?.ProvinceName || ''
    );

  } catch (e) {

    console.error(e);
  }
};

 const handleDistrictChange = async (id: string) => {

  const did = parseInt(id);

  const dist =
    districts.find(
      (d) => d.DistrictID === did
    );

  setForm((f) => ({
    ...f,
    district_id: did,
    district_name: dist?.DistrictName || '',
    ward_code: '',
    ward_name: '',
  }));

  setWards([]);

  try {

    setWards(
      await ghnService.getWards(did)
    );

    await updateMapByAddress(
      form.province_name,
      dist?.DistrictName || ''
    );

  } catch (e) {

    console.error(e);
  }
};
const autoLocateAddress = async (
  detail: string,
  province: string,
  district: string,
  ward: string
) => {
  try {

    const q =
  `${detail}, ${ward}, ${district}, ${province}, Vietnam`;

   const res = await fetch(
  `/api/geocode/search?query=${encodeURIComponent(q)}`
);

const json = await res.json();

if (json.success) {

      const lat = Number(json.data.lat);
      const lng = Number(json.data.lng);

      setAutoLocation({ lat, lng });

      setMapCoords({ lat, lng });
    }

  } catch (err) {
    console.error("Auto locate failed", err);
  }
};
  const handleWardChange = async (
  code: string
) => {

  const ward =
    wards.find(
      (w) => w.WardCode === code
    );

  const wardName =
    ward?.WardName || '';

  const provinceName =
    form.province_name;

  const districtName =
    form.district_name;

  setForm((f) => ({
    ...f,
    ward_code: code,
    ward_name: wardName,
  }));

  await updateMapByAddress(
    provinceName,
    districtName,
    wardName
  );
};
  // ── Submit new address ──────────────────────────────
  const handleSubmit = async () => {
    if (!form.recipient_name.trim()) { toast.error('Nhập họ tên người nhận'); return; }
    if (!form.phone.trim())          { toast.error('Nhập số điện thoại'); return; }
    if (!form.province_id)           { toast.error('Chọn Tỉnh/Thành phố'); return; }
    if (!form.district_id)           { toast.error('Chọn Quận/Huyện'); return; }
    if (!form.ward_code)             { toast.error('Chọn Phường/Xã'); return; }
    if (!form.detail.trim())         { toast.error('Nhập địa chỉ cụ thể'); return; }
    if (!mapCoords)                  { toast.error('Vui lòng nhấn ✓ OK trên bản đồ để xác nhận vị trí'); return; }

    setSubmitting(true);
    try {
      const created = await addressService.createAddress({
        recipient_name: form.recipient_name,
        phone: form.phone,
        province: form.province_name,
        district: form.district_name,
        ward: form.ward_name,
        detail: form.detail,
        is_default: form.is_default,
        province_id: form.province_id,
        district_id: form.district_id,
        ward_code: form.ward_code,
      });

      // Save lat/lng to the created address
      if (mapCoords && (created as any).id) {
        try {
          await apiRequest(`/addresses/${(created as any).id}`, {
            method: 'PUT',
            body: JSON.stringify({ latitude: mapCoords.lat, longitude: mapCoords.lng }),
          });
        } catch (e) { console.warn('lat/lng save failed', e); }
      }

      toast.success('Đã thêm địa chỉ!');
      resetForm();
      await loadAddresses();

      // Auto-select the new address
      const all = await addressService.getAddresses();
      const newest = all.find((a) => a.id === (created as any).id) || all[all.length - 1];
      if (newest) {
        const withCoords: UserAddress = {
          ...newest,
          latitude: mapCoords?.lat ?? newest.latitude,
          longitude: mapCoords?.lng ?? newest.longitude,
        };
        onSelect(withCoords.id, withCoords);
      }
      setShowAddForm(false);
      setIsChoosing(false);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thêm địa chỉ');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ recipient_name: '', phone: '', detail: '', province_id: 0, province_name: '', district_id: 0, district_name: '', ward_code: '', ward_name: '', is_default: false });
    setDistricts([]); setWards([]); setMapCoords(null);
  };

  const currentAddress = addresses.find((a) => a.id === selectedId);

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    border: '1.5px solid #e5e7eb', borderRadius: 10,
    fontSize: 13, fontFamily: 'inherit', outline: 'none',
    transition: 'border-color .15s',
    boxSizing: 'border-box',
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, background: '#fff', cursor: 'pointer' };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px', color: '#94a3b8', fontSize: 13 }}>
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
        Đang tải địa chỉ...
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── No addresses yet ───────────────────────────────────────────────────────
  if (addresses.length === 0 && !showAddForm) {
    return (
      <div>
        <div style={{
          textAlign: 'center', padding: '24px 16px',
          background: '#fafafa', borderRadius: 14,
          border: '1.5px dashed #e5e7eb', marginBottom: 12,
        }}>
          <MapPin size={28} color="#d1d5db" style={{ marginBottom: 8 }} />
          <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>Bạn chưa có địa chỉ nào</p>
        </div>
        <button onClick={() => setShowAddForm(true)} style={addBtnStyle}>
          <Plus size={16} /> Thêm địa chỉ mới
        </button>
      </div>
    );
  }

  // ── Compact view (has address, not choosing) ───────────────────────────────
  if (!isChoosing && !showAddForm && currentAddress) {
    const hasCoords = !!(currentAddress.latitude && currentAddress.longitude);
    return (
      <div style={{
        padding: '14px 16px', borderRadius: 14,
        background: '#f0f7ff', border: '1.5px solid #bfdbfe',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <MapPin size={16} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>{currentAddress.recipient_name}</span>
              <span style={{ color: '#d1d5db' }}>|</span>
              <span style={{ fontSize: 13, color: '#6b7280' }}>{currentAddress.phone}</span>
              {currentAddress.is_default && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#ede9fe', color: '#7c3aed' }}>
                  Mặc định
                </span>
              )}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                background: hasCoords ? '#f0fdf4' : '#fff7ed',
                color: hasCoords ? '#16a34a' : '#ea580c',
                border: `1px solid ${hasCoords ? '#bbf7d0' : '#fed7aa'}`,
              }}>
                {hasCoords ? '✓ Có tọa độ' : '⚠ Chưa có tọa độ'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
              {currentAddress.detail}, {currentAddress.ward}, {currentAddress.district}, {currentAddress.province}
            </p>
          </div>
          <button
            onClick={() => setIsChoosing(true)}
            style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 8,
              border: '1.5px solid #c7d2fe', background: '#fff',
              color: '#6366f1', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            Thay đổi <ChevronDown size={12} />
          </button>
        </div>
      </div>
    );
  }

  // ── Add address form ───────────────────────────────────────────────────────
  if (showAddForm) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Form header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>
            📍 Địa chỉ nhận hàng mới
          </span>
          <button
            onClick={() => { setShowAddForm(false); resetForm(); }}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Name + Phone */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Họ và tên người nhận</label>
            <input
              style={inputStyle}
              placeholder="Nguyễn Văn A"
              value={form.recipient_name}
              onChange={(e) => setForm((f) => ({ ...f, recipient_name: e.target.value }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Số điện thoại</label>
            <input
              style={inputStyle}
              placeholder="0901234567"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
        </div>

        {/* Province */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Tỉnh / Thành phố</label>
          <select
            style={selectStyle}
            value={form.province_id || ''}
            onChange={(e) => handleProvinceChange(e.target.value)}
          >
            <option value="">-- Chọn Tỉnh/Thành phố --</option>
            {provinces.map((p) => (
              <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>
            ))}
          </select>
        </div>

        {/* District + Ward */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Quận / Huyện</label>
            <select
              style={{ ...selectStyle, opacity: form.province_id ? 1 : 0.5 }}
              disabled={!form.province_id}
              value={form.district_id || ''}
              onChange={(e) => handleDistrictChange(e.target.value)}
            >
              <option value="">-- Chọn Quận/Huyện --</option>
              {districts.map((d) => (
                <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Phường / Xã</label>
            <select
              style={{ ...selectStyle, opacity: form.district_id ? 1 : 0.5 }}
              disabled={!form.district_id}
              value={form.ward_code}
              onChange={(e) => handleWardChange(e.target.value)}
            >
              <option value="">-- Chọn Phường/Xã --</option>
              {wards.map((w) => (
                <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Detail */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Số nhà, tên đường</label>
          <input
            style={inputStyle}
            placeholder="Ví dụ: 12 Nguyễn Văn Bảo"
            value={form.detail}
            onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))}
          />
        </div>

        {/* Default checkbox */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, color: '#374151', cursor: 'pointer',
          marginBottom: 4,
        }}>
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
            style={{ width: 15, height: 15, accentColor: '#6366f1', cursor: 'pointer' }}
          />
          Đặt làm địa chỉ mặc định
        </label>

        {/* Inline Map */}
        <InlineMap
          autoLat={autoLocation?.lat}
          autoLng={autoLocation?.lng}
          onConfirm={(lat, lng) => {
            setMapCoords({ lat, lng });
          }}
        />

        {/* Coords confirmed notice */}
        {mapCoords && (
          <div style={{
            marginTop: 8, padding: '8px 14px',
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 10, fontSize: 12, color: '#16a34a', fontWeight: 600,
          }}>
            ✓ Tọa độ đã xác nhận: {mapCoords.lat.toFixed(5)}, {mapCoords.lng.toFixed(5)}
          </div>
        )}

        {!mapCoords && (
          <div style={{
            marginTop: 8, padding: '8px 14px',
            background: '#fff7ed', border: '1px solid #fed7aa',
            borderRadius: 10, fontSize: 12, color: '#92400e',
          }}>
            ⚠ Nhấn <strong>✓ OK</strong> trên bản đồ để xác nhận vị trí — cần thiết để tính phí ship
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            marginTop: 16,
            padding: '13px',
            background: submitting ? '#a5b4fc' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border: 'none', borderRadius: 12,
            color: '#fff', fontWeight: 700, fontSize: 15, cursor: submitting ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', transition: 'all .2s',
          }}
        >
          {submitting
            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Đang lưu...</>
            : <><CheckCircle size={16} /> Lưu địa chỉ</>
          }
        </button>

        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── Address list + choose ──────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
     {isChoosing  && (
  <>
     {addresses.map((addr) => {
        const isSelected = selectedId === addr.id;
        const hasCoords  = !!(addr.latitude && addr.longitude);
        return (
          <div
            key={addr.id}
            onClick={() => { onSelect(addr.id, addr); setIsChoosing(false); }}
            style={{
              padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
              border: `2px solid ${isSelected ? '#6366f1' : '#e5e7eb'}`,
              background: isSelected ? '#f5f3ff' : '#fff',
              transition: 'all .15s',
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: isSelected ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MapPin size={15} color={isSelected ? '#fff' : '#94a3b8'} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#111' }}>{addr.recipient_name}</span>
                <span style={{ color: '#d1d5db', fontSize: 12 }}>|</span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{addr.phone}</span>
                {addr.is_default && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: '#ede9fe', color: '#7c3aed' }}>
                    Mặc định
                  </span>
                )}
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99,
                  background: hasCoords ? '#f0fdf4' : '#fff7ed',
                  color: hasCoords ? '#16a34a' : '#ea580c',
                  border: `1px solid ${hasCoords ? '#bbf7d0' : '#fed7aa'}`,
                }}>
                  {hasCoords ? '✓ Có tọa độ' : '⚠ Chưa có tọa độ'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                {addr.detail}, {addr.ward}, {addr.district}, {addr.province}
              </p>
            </div>
            {isSelected && <CheckCircle size={18} color="#6366f1" style={{ flexShrink: 0 }} />}
          </div>
        );
      })}

  </>
)}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        {currentAddress && (
          <button
            onClick={() => setIsChoosing(false)}
            style={{
              flex: 1, padding: '11px', borderRadius: 10,
              border: '1.5px solid #e5e7eb', background: '#fff',
              color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            Hủy
          </button>
        )}
        <button
          onClick={() => setShowAddForm(true)}
          style={{ ...addBtnStyle, flex: currentAddress ? 1 : undefined, width: currentAddress ? undefined : '100%' }}
        >
          <Plus size={15} /> Thêm địa chỉ mới
        </button>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

const addBtnStyle: React.CSSProperties = {
  padding: '11px 18px', borderRadius: 10,
  border: '1.5px dashed #c7d2fe', background: '#f5f3ff',
  color: '#6366f1', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  transition: 'all .15s',
};

export default AddressSelector;