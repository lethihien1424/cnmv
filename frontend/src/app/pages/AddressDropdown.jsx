// frontend/src/app/pages/AddressDropdown.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AddressDropdown = ({
  onAddressChange,
  onLocationSearch,
}) => {
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);

    const [selectedProvince, setSelectedProvince] = useState(null);
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [selectedWard, setSelectedWard] = useState(null);
    const [street, setStreet] = useState("");

    // Gọi API lấy dữ liệu Tỉnh/Thành
    useEffect(() => {
        axios.get('http://localhost:5000/api/ghn/provinces')
            .then(res => setProvinces(res.data.data || []))
            .catch(err => console.error(err));
    }, []);

    useEffect(() => {
        if (!selectedProvince) return;
        axios.get(`http://localhost:5000/api/ghn/districts/${selectedProvince.ProvinceID}`)
            .then(res => setDistricts(res.data.data || []));
    }, [selectedProvince]);

    useEffect(() => {
        if (!selectedDistrict) return;
        axios.get(`http://localhost:5000/api/ghn/wards/${selectedDistrict.DistrictID}`)
            .then(res => setWards(res.data.data || []));
    }, [selectedDistrict]);

    // HÀM QUAN TRỌNG: Nối chuỗi địa chỉ và gửi lên file cha
    const updateFullAddress = (newStreet, newWard, newDistrict, newProvince) => {
        const addrParts = [];
        if (newStreet) addrParts.push(newStreet);
        if (newWard) addrParts.push(newWard.WardName);
        if (newDistrict) addrParts.push(newDistrict.DistrictName);
        if (newProvince) addrParts.push(newProvince.ProvinceName);

        const fullAddress = addrParts.join(", ");
        
        // Bắn dữ liệu lên cho StoreSettingsPage
        if (onAddressChange) {
            onAddressChange(fullAddress);
        }
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                    className="w-full border p-2 rounded-md text-sm"
                    onChange={(e) => {
                        const p = provinces.find(x => x.ProvinceID === Number(e.target.value));
                        setSelectedProvince(p);
                        setSelectedDistrict(null);
                        setSelectedWard(null);
                        updateFullAddress(street, null, null, p);
                       
                    }}
                >
                    <option value="">-- Chọn Tỉnh/Thành phố --</option>
                    {provinces.map(p => <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>)}
                </select>

                <select
                    disabled={!selectedProvince}
                    className="w-full border p-2 rounded-md text-sm disabled:bg-gray-100"
                    onChange={(e) => {
                        const d = districts.find(x => x.DistrictID === Number(e.target.value));
                        setSelectedDistrict(d);
                        setSelectedWard(null);
                        updateFullAddress(street, null, d, selectedProvince);
                    }}
                >
                    <option value="">-- Chọn Quận/Huyện --</option>
                    {districts.map(d => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
                </select>

                <select
                    disabled={!selectedDistrict}
                    className="w-full border p-2 rounded-md text-sm disabled:bg-gray-100"
                    onChange={(e) => {
                        const w = wards.find(x => x.WardCode === String(e.target.value));
                        setSelectedWard(w);
                        updateFullAddress(street, w, selectedDistrict, selectedProvince);

                        onLocationSearch?.(
  `${w.WardName}, ${selectedDistrict?.DistrictName || ""}, ${selectedProvince?.ProvinceName || ""}`
);
                    }}
                >
                    <option value="">-- Chọn Phường/Xã --</option>
                    {wards.map(w => <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>)}
                </select>
            </div>

            <div className="mt-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Số nhà, tên đường</label>
                <input
                    type="text"
                    placeholder="Ví dụ: 12 Nguyễn Văn Bảo"
                    className="w-full border-2 border-gray-200 p-2 rounded-md text-sm focus:border-purple-500 outline-none transition-all"
                    value={street}
                    onChange={(e) => {
                        setStreet(e.target.value);
                        updateFullAddress(e.target.value, selectedWard, selectedDistrict, selectedProvince);
                        if (
                        selectedWard &&
                        selectedDistrict &&
                        selectedProvince
                        ) {

                        onLocationSearch?.(
                            [
                            e.target.value,
                            selectedWard.WardName,
                            selectedDistrict.DistrictName,
                            selectedProvince.ProvinceName,
                            ]
                            .filter(Boolean)
                            .join(", ")
                        );
                        }
                    }}
                />
            </div>
        </div>
    );
};

export default AddressDropdown;