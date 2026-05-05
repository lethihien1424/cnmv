import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { GoogleMap, LoadScript, Marker, Autocomplete } from '@react-google-maps/api';
import axios from 'axios'; // Import axios để gọi API
import {
  ChevronLeft,
  ChevronRight,
  Check,
  MapPin,
  Upload,
  AlertCircle,
  Store,
  Truck,
  FileText,
  CreditCard,
  Image as ImageIcon
} from 'lucide-react';

type OnboardingStep = 'shop-info' | 'shipping' | 'identity' | 'tax';

type AdministrativeItem = {
  code: number;
  name: string;
};

const VN_ADMIN_API = 'https://provinces.open-api.vn/api';

const defaultCenter = {
  lat: 10.8231,
  lng: 106.6297
};

const libraries: ("places")[] = ["places"];

export default function SellerOnboardingPage() {
  const navigate = useNavigate();
  const { user, token, updateUser } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('shop-info');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // State loading khi gọi API
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [servicePackage, setServicePackage] = useState('0');
  const [bankAccount, setBankAccount] = useState('');

  // Form states
  const [shopName, setShopName] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [shippingMethod, setShippingMethod] = useState<'processing' | 'active'>('processing');
  const [isDefaultAddress, setIsDefaultAddress] = useState(false);
  const [isPickupAddress, setIsPickupAddress] = useState(true);

  // States cho Identity
  const [cccdNumber, setCccdNumber] = useState('');
  const [fullNameIdentity, setFullNameIdentity] = useState('');
  
  // States Upload ẢNH (Lưu URL xem trước VÀ lưu File thực tế để gửi API)
  const [frontIdImage, setFrontIdImage] = useState<string | null>(null);
  const [backIdImage, setBackIdImage] = useState<string | null>(null);
  const [frontIdFile, setFrontIdFile] = useState<File | null>(null); // MỚI THÊM
  const [backIdFile, setBackIdFile] = useState<File | null>(null);   // MỚI THÊM
  
  const frontIdRef = useRef<HTMLInputElement>(null);
  const backIdRef = useRef<HTMLInputElement>(null);

  // LỖI (Error States)
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [cccdError, setCccdError] = useState('');
  const [shopNameError, setShopNameError] = useState('');
  const [idImageError, setIdImageError] = useState(''); 
  const [identityVerifyError, setIdentityVerifyError] = useState('');
  const [identityVerifySuccess, setIdentityVerifySuccess] = useState('');
  const [isIdentityVerifying, setIsIdentityVerifying] = useState(false);

  // States cho Map & Autocomplete
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [markerPosition, setMarkerPosition] = useState(defaultCenter);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  // Address form
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [street, setStreet] = useState('');
  const [provinceCode, setProvinceCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [provinces, setProvinces] = useState<AdministrativeItem[]>([]);
  const [districts, setDistricts] = useState<AdministrativeItem[]>([]);
  const [wards, setWards] = useState<AdministrativeItem[]>([]);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  React.useEffect(() => {
    const loadProvinces = async () => {
      setIsLocationLoading(true);
      setLocationError('');
      try {
        const res = await fetch(`${VN_ADMIN_API}/p/`);
        if (!res.ok) throw new Error('Không thể tải danh sách Tỉnh/Thành phố');
        const data: AdministrativeItem[] = await res.json();
        setProvinces(data.sort((a, b) => a.name.localeCompare(b.name, 'vi')));
      } catch (_error) {
        setLocationError('Không tải được dữ liệu khu vực. Vui lòng thử lại.');
      } finally {
        setIsLocationLoading(false);
      }
    };
    loadProvinces();
  }, []);

  const handleProvinceChange = async (nextProvinceCode: string) => {
    setProvinceCode(nextProvinceCode);
    setDistrictCode(''); setWardCode(''); setDistrict(''); setWard(''); setDistricts([]); setWards([]);
    const selectedProvince = provinces.find((item) => String(item.code) === nextProvinceCode);
    setProvince(selectedProvince?.name || '');
    if (!nextProvinceCode) return;

    setIsLocationLoading(true);
    setLocationError('');
    try {
      const res = await fetch(`${VN_ADMIN_API}/p/${nextProvinceCode}?depth=2`);
      if (!res.ok) throw new Error('Không thể tải danh sách Quận/Huyện');
      const data = await res.json();
      setDistricts((data?.districts || []).sort((a: AdministrativeItem, b: AdministrativeItem) => a.name.localeCompare(b.name, 'vi')));
    } catch (_error) {
      setLocationError('Không tải được Quận/Huyện. Vui lòng chọn lại.');
    } finally {
      setIsLocationLoading(false);
    }
  };

  const handleDistrictChange = async (nextDistrictCode: string) => {
    setDistrictCode(nextDistrictCode);
    setWardCode(''); setWard(''); setWards([]);
    const selectedDistrict = districts.find((item) => String(item.code) === nextDistrictCode);
    setDistrict(selectedDistrict?.name || '');
    if (!nextDistrictCode) return;

    setIsLocationLoading(true);
    setLocationError('');
    try {
      const res = await fetch(`${VN_ADMIN_API}/d/${nextDistrictCode}?depth=2`);
      if (!res.ok) throw new Error('Không thể tải danh sách Phường/Xã');
      const data = await res.json();
      setWards((data?.wards || []).sort((a: AdministrativeItem, b: AdministrativeItem) => a.name.localeCompare(b.name, 'vi')));
    } catch (_error) {
      setLocationError('Không tải được Phường/Xã. Vui lòng chọn lại.');
    } finally {
      setIsLocationLoading(false);
    }
  };

  const handleWardChange = (nextWardCode: string) => {
    setWardCode(nextWardCode);
    const selectedWard = wards.find((item) => String(item.code) === nextWardCode);
    setWard(selectedWard?.name || '');
  };

  const steps = [
    { id: 'shop-info', label: 'Thông tin Shop', icon: Store },
    { id: 'shipping', label: 'Cài đặt vận chuyển', icon: Truck },
    { id: 'identity', label: 'Thông định danh', icon: FileText },
    { id: 'tax', label: 'Hoàn tất', icon: CreditCard },
  ];

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  const handleFrontIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFrontIdFile(file); // Lưu file thật để gọi API
      setFrontIdImage(URL.createObjectURL(file)); // Lưu URL để xem trước
      setIdImageError(''); 
      setIdentityVerifyError('');
      setIdentityVerifySuccess('');
    }
  };

  const handleBackIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackIdFile(file); // Lưu file thật để gọi API
      setBackIdImage(URL.createObjectURL(file)); // Lưu URL để xem trước
      setIdImageError(''); 
      setIdentityVerifyError('');
      setIdentityVerifySuccess('');
    }
  };

  const handleNext = async () => {
    if (currentStep === 'shop-info') {
      if (!shopName.trim()) { setShopNameError('Vui lòng nhập tên Shop'); return; }
      setShopNameError('');
      if (!pickupAddress) { alert('Vui lòng thiết lập địa chỉ lấy hàng!'); return; }
      if (!email) { alert('Vui lòng thiết lập Email!'); return; }
      if (!phone) { alert('Vui lòng thiết lập Số điện thoại!'); return; }

      setEmailError('');
      setPhoneError('');
      setShopNameError('');

      try {
        const payload = {
          email: email.trim(),
          phone: phone.trim(),
          store_name: shopName.trim(),
        };

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        try {
          await axios.post(
            'http://localhost:5000/api/stores/check-c2c-availability',
            payload,
            { headers },
          );
        } catch (primaryError: any) {
          if (primaryError?.response?.status === 404) {
            await axios.post(
              'http://localhost:5000/api/admin/check-c2c-availability',
              payload,
              { headers },
            );
          } else {
            throw primaryError;
          }
        }
      } catch (error: any) {
        const duplicateMessages = error.response?.data?.data?.duplicateMessages;

        if (duplicateMessages) {
          let hasDuplicate = false;

          if (duplicateMessages.email) {
            setEmailError(duplicateMessages.email);
            setShowEmailModal(true);
            hasDuplicate = true;
          }

          if (duplicateMessages.phone) {
            setPhoneError(duplicateMessages.phone);
            setShowAddressModal(true);
            hasDuplicate = true;
          }

          if (duplicateMessages.storeName) {
            setShopNameError(duplicateMessages.storeName);
            hasDuplicate = true;
          }

          if (hasDuplicate) {
            return;
          }
        }

        const message = error.response?.data?.message || 'Không thể kiểm tra dữ liệu trùng. Vui lòng thử lại.';
        if (message.toLowerCase().includes('email')) {
          setEmailError(message);
          setShowEmailModal(true);
        } else if (message.toLowerCase().includes('điện thoại') || message.toLowerCase().includes('phone')) {
          setPhoneError(message);
          setShowAddressModal(true);
        } else if (message.toLowerCase().includes('shop')) {
          setShopNameError(message);
        } else {
          alert(message);
        }
        return;
      }
    }

    if (currentStep === 'identity') {
      if (!frontIdFile || !backIdFile) {
        setIdImageError('Vui lòng tải lên ĐẦY ĐỦ mặt trước và mặt sau CCCD');
        return;
      }
      setIdImageError('');

      const cccdRegex = /^\d{12}$/;
      if (!cccdRegex.test(cccdNumber)) {
        setCccdError('Số CCCD không hợp lệ (Bắt buộc phải đủ 12 số)');
        return;
      }
      setCccdError('');

      if (!fullNameIdentity.trim()) {
        alert('Vui lòng nhập Họ & Tên định danh!');
        return;
      }

      try {
        setIsIdentityVerifying(true);
        setIdentityVerifyError('');
        setIdentityVerifySuccess('');

        const verifyFormData = new FormData();
        verifyFormData.append('identity_card', cccdNumber);
        verifyFormData.append('representative_name', fullNameIdentity.trim());
        verifyFormData.append('front_id_image', frontIdFile);
        verifyFormData.append('back_id_image', backIdFile);

        await axios.post(
          'http://localhost:5000/api/stores/verify-c2c-identity',
          verifyFormData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        setIdentityVerifySuccess('CCCD hợp lệ và khớp thông tin. Bạn có thể tiếp tục.');
      } catch (error: any) {
        setIdentityVerifyError(error.response?.data?.message || 'Không thể xác thực CCCD. Vui lòng kiểm tra ảnh rõ nét và thử lại.');
        return;
      } finally {
        setIsIdentityVerifying(false);
      }
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id as OnboardingStep);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id as OnboardingStep);
    } else {
      navigate(-1);
    }
  };

  // --- HÀM GỌI API LƯU STORE VÀ CHUYỂN HƯỚNG ---
  const handleSubmitFinal = async () => {
    if (!policyAccepted) {
      alert('Bạn cần đồng ý điều khoản phí và vận hành trước khi đăng ký bán hàng.');
      return;
    }

    if (!frontIdFile || !backIdFile) {
      alert('Vui lòng tải đầy đủ ảnh CCCD mặt trước và mặt sau trước khi kích hoạt shop C2C.');
      return;
    }

    if (!fullNameIdentity.trim()) {
      alert('Vui lòng nhập Họ và Tên định danh để đối chiếu với CCCD.');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('store_name', shopName);
      formData.append('description', `Địa chỉ lấy hàng: ${pickupAddress}`);
      formData.append('contact_email', email.trim());
      formData.append('contact_phone', phone.trim());
      formData.append('identity_card', cccdNumber);
      formData.append('representative_name', fullNameIdentity.trim());
      formData.append('bank_account', bankAccount || '');
      formData.append('service_fee_rate', String(Number(servicePackage)));
      formData.append('policy_accepted', 'true');
      formData.append('front_id_image', frontIdFile);
      formData.append('back_id_image', backIdFile);

      const response = await axios.post(
        'http://localhost:5000/api/stores/activate-c2c',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const createdStore = response.data?.data;

      // Lưu trạng thái kích hoạt shop để giao diện đổi từ "Kích hoạt Shop C2C" sang "Quản lý Shop"
      if (user?.role === 'customer') {
        updateUser({
          hasC2CStore: true,
          storeName: createdStore?.store_name || shopName.trim() || user.storeName,
          c2cStoreId: createdStore?.id || user.c2cStoreId,
        });
      }

      alert('Tạo Shop thành công!');
      
      // CHUYỂN HƯỚNG SANG TRANG QUẢN LÝ SHOP
      navigate('/seller/dashboard'); 
      
    } catch (error: any) {
      alert("Đã xảy ra lỗi khi tạo shop: " + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Email không hợp lệ');
      return;
    }
    setEmailError('');
    setShowEmailModal(false);
  };

  const handleSaveAddress = () => {
    const phoneRegex = /^0\d{9}$/; 
    if (!phoneRegex.test(phoneNumber)) {
      setPhoneError('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0');
      return;
    }
    setPhoneError('');
    
    const fullAddress = [street, ward, district, province].filter(Boolean).join(', ');
    setPickupAddress(fullAddress || 'Địa chỉ lấy hàng chưa đầy đủ');
    setPhone(phoneNumber); 
    setShowAddressModal(false);
  };

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setMarkerPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    }
  };

  const onLoadAutocomplete = (autocompleteObj: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteObj);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const newPos = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
        setMapCenter(newPos);
        setMarkerPosition(newPos);
        if (place.name) {
          setStreet(place.name + (place.formatted_address ? `, ${place.formatted_address}` : ''));
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="text-xl">Thông tin Shop</h1>
            <button className="text-red-500 hover:text-red-600">Lưu</button>
          </div>
        </div>
      </header>

      {/* Progress Stepper */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStepIndex === index;
              const isCompleted = currentStepIndex > index;
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center flex-1">
                    <div className={`size-10 rounded-full flex items-center justify-center mb-2 transition-all ${isCompleted ? 'bg-red-500 text-white' : isActive ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {isCompleted ? <Check className="size-5" /> : <Icon className="size-5" />}
                    </div>
                    <span className={`text-xs text-center ${isActive ? 'text-red-500 font-medium' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && <div className={`h-0.5 flex-1 mx-2 -mt-8 transition-all ${isCompleted ? 'bg-red-500' : 'bg-gray-200'}`} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {currentStep === 'shop-info' && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <Label htmlFor="shop-name">Tên Shop <span className="text-red-500">*</span></Label>
                <div className="flex items-center justify-between mt-2">
                  <Input
                    id="shop-name"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="Nhập tên shop"
                    className={`flex-1 ${shopNameError ? 'border-red-500' : ''}`}
                  />
                  <span className="text-sm text-gray-500 ml-3">{shopName.length}/30</span>
                </div>
                {shopNameError && <p className="text-sm text-red-500 mt-1">{shopNameError}</p>}
              </div>

              <Separator />

              <div>
                <Label htmlFor="pickup-address">Địa chỉ lấy hàng <span className="text-red-500">*</span></Label>
                <button
                  onClick={() => setShowAddressModal(true)}
                  className="w-full mt-2 px-4 py-3 border-2 border-gray-200 rounded-lg text-left hover:border-gray-300 transition-all flex items-center justify-between"
                >
                  <span className={pickupAddress ? 'text-gray-900' : 'text-gray-400'}>{pickupAddress || 'Thiết lập địa chỉ'}</span>
                  <ChevronRight className="size-5 text-gray-400" />
                </button>
              </div>

              <Separator />

              <div>
                <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="w-full mt-2 px-4 py-3 border-2 border-gray-200 rounded-lg text-left hover:border-gray-300 transition-all flex items-center justify-between"
                >
                  <span className={email ? 'text-gray-900' : 'text-gray-400'}>{email || 'Chưa thiết lập email...'}</span>
                  <ChevronRight className="size-5 text-gray-400" />
                </button>
              </div>

              <Separator />

              <div>
                <Label htmlFor="phone">Số điện thoại <span className="text-red-500">*</span></Label>
                <button className="w-full mt-2 px-4 py-3 border-2 border-gray-200 rounded-lg text-left hover:border-gray-300 transition-all flex items-center justify-between cursor-default">
                  <span className={phone ? 'text-gray-900' : 'text-gray-400'}>{phone || 'Sẽ thiết lập kèm Địa chỉ'}</span>
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'shipping' && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-lg mb-4">Cài đặt vận chuyển</h3>
                <p className="text-sm text-gray-600 mb-6">Vui lòng kích hoạt ít nhất 01 Phương thức vận chuyển!</p>
                <div className="space-y-4">
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${shippingMethod === 'processing' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => setShippingMethod('processing')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Truck className="size-5 text-gray-600" />
                        </div>
                        <span className="font-medium">Đang xử lý</span>
                      </div>
                      <span className="text-sm text-gray-500">Đang thực hiện</span>
                    </div>
                  </div>
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${shippingMethod === 'active' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => setShippingMethod('active')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Truck className="size-5 text-gray-600" />
                        </div>
                        <span className="font-medium">Đang thực hiện</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'identity' && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="size-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">Vui lòng cung cấp Thông Tin Định Danh của Chủ Shop (nếu là cá nhân), hoặc Người Đại Diện Pháp Lý trên giấy đăng ký kinh doanh.</p>
              </div>

              <div>
                <Label>Quốc Tịch <span className="text-red-500">*</span></Label>
                <button className="w-full mt-2 px-4 py-3 border-2 border-gray-200 rounded-lg text-left hover:border-gray-300 transition-all flex items-center justify-between">
                  <span>Việt Nam</span><ChevronRight className="size-5 text-gray-400" />
                </button>
              </div>

              <Separator />

              <div>
                <Label className="mb-3 block">
                  Hình chụp CCCD <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  
                  {/* Ô Upload Mặt Trước */}
                  <div>
                    <input type="file" accept="image/*" className="hidden" ref={frontIdRef} onChange={handleFrontIdUpload} />
                    <button 
                      onClick={() => frontIdRef.current?.click()} 
                      className={`w-full aspect-[3/2] border-2 border-dashed ${idImageError && !frontIdImage ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg flex flex-col items-center justify-center hover:border-gray-400 transition-all overflow-hidden relative group`}
                    >
                      {frontIdImage ? (
                        <>
                          <img src={frontIdImage} alt="Mặt trước CCCD" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs">Đổi ảnh khác</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className={`size-6 mb-2 ${idImageError ? 'text-red-400' : 'text-gray-400'}`} />
                          <span className={`text-xs ${idImageError ? 'text-red-500' : 'text-gray-500'}`}>Tải lên Mặt Trước</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Ô Upload Mặt Sau */}
                  <div>
                    <input type="file" accept="image/*" className="hidden" ref={backIdRef} onChange={handleBackIdUpload} />
                    <button 
                      onClick={() => backIdRef.current?.click()} 
                      className={`w-full aspect-[3/2] border-2 border-dashed ${idImageError && !backIdImage ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg flex flex-col items-center justify-center hover:border-gray-400 transition-all overflow-hidden relative group`}
                    >
                      {backIdImage ? (
                        <>
                          <img src={backIdImage} alt="Mặt sau CCCD" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs">Đổi ảnh khác</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className={`size-6 mb-2 ${idImageError ? 'text-red-400' : 'text-gray-400'}`} />
                          <span className={`text-xs ${idImageError ? 'text-red-500' : 'text-gray-500'}`}>Tải lên Mặt Sau</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {idImageError && <p className="text-sm text-red-500 mt-2">{idImageError}</p>}
              </div>

              <Separator />

              <div>
                <Label htmlFor="cccd">Số Căn Cước Công Dân (CCCD) <span className="text-red-500">*</span></Label>
                <Input
                  id="cccd"
                  value={cccdNumber}
                  onChange={(e) => {
                    setCccdNumber(e.target.value);
                    setIdentityVerifyError('');
                    setIdentityVerifySuccess('');
                  }}
                  placeholder="Nhập 12 số CCCD"
                  className={`mt-2 ${cccdError ? 'border-red-500' : ''}`}
                  maxLength={12}
                />
                {cccdError && <p className="text-sm text-red-500 mt-1">{cccdError}</p>}
              </div>

              <Separator />

              <div>
                <Label htmlFor="fullname">Họ & Tên <span className="text-red-500">*</span></Label>
                <Input
                  id="fullname"
                  value={fullNameIdentity}
                  onChange={(e) => {
                    setFullNameIdentity(e.target.value);
                    setIdentityVerifyError('');
                    setIdentityVerifySuccess('');
                  }}
                  placeholder="Nhập họ và tên"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">Nhập đúng như trên CCCD/Hộ Chiếu</p>
              </div>

              {identityVerifyError && (
                <p className="text-sm text-red-500">{identityVerifyError}</p>
              )}
              {identityVerifySuccess && (
                <p className="text-sm text-green-600">{identityVerifySuccess}</p>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === 'tax' && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="text-center py-8">
                <div className="size-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="size-8 text-green-600" />
                </div>
                <h3 className="text-xl mb-2">Hoàn thành!</h3>
                <p className="text-gray-600">Bạn đã hoàn thành việc điền thông tin Shop. Hãy xác nhận để bắt đầu kinh doanh ngay!</p>
              </div>

              <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                <p className="font-semibold">Điều khoản phí và vận hành dành cho người bán</p>
                <p>- Miễn phí đăng ký, tối đa 3 tài khoản bán hàng cho mỗi bộ hồ sơ CCCD/MST/Ngân hàng.</p>
                <p>- Phải cung cấp thông tin cá nhân/doanh nghiệp chính xác để xác thực.</p>
                <p>- Phí cố định 4% trên doanh thu đơn đã giao thành công.</p>
                <p>- Phí thanh toán 5% trên tổng giá trị đơn hàng.</p>
                <p>- Phí dịch vụ thêm từ 1% - 5% khi tham gia Freeship/Voucher Extra.</p>
                <p>- Phí trả hàng người bán chịu, tối đa 40.000đ/đơn (20.000đ với đơn hỏa tốc).</p>
                <p>- Không đăng bán hàng cấm, hàng giả, hàng nhái; không buff đơn, không gian lận và không lôi kéo khách ra ngoài sàn.</p>
                <p>- Thuế hộ kinh doanh: doanh thu trên 100 triệu/năm chịu 1% GTGT và 0.5% TNCN.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank-account">Số tài khoản ngân hàng</Label>
                <Input
                  id="bank-account"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="Nhập số tài khoản để đối soát"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-package">Gói dịch vụ (nếu tham gia)</Label>
                <select
                  id="service-package"
                  value={servicePackage}
                  onChange={(e) => setServicePackage(e.target.value)}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="0">Không tham gia gói dịch vụ (0%)</option>
                  <option value="0.01">Gói cơ bản (+1%)</option>
                  <option value="0.03">Gói tăng trưởng (+3%)</option>
                  <option value="0.05">Gói tối đa (+5%)</option>
                </select>
              </div>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={policyAccepted}
                  onChange={(e) => setPolicyAccepted(e.target.checked)}
                />
                <span>Tôi đã đọc, hiểu và đồng ý toàn bộ chính sách phí, điều khoản vận hành của sàn.</span>
              </label>
            </CardContent>
          </Card>
        )}

        {/* NÚT HOÀN TẤT VÀ CHUYỂN TRANG */}
        <div className="flex gap-3 mt-6">
          <Button onClick={handleBack} variant="outline" className="flex-1 h-12">Quay lại</Button>
          
          {currentStepIndex === steps.length - 1 ? (
            <Button 
              onClick={handleSubmitFinal} 
              disabled={isLoading}
              className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white"
            >
              {isLoading ? "Đang xử lý..." : "Hoàn tất & Tới Quản lý Shop"}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={isIdentityVerifying} className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white">
              {isIdentityVerifying ? 'Đang kiểm tra CCCD...' : 'Tiếp theo'}
            </Button>
          )}
        </div>
      </div>

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddressModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <button onClick={() => setShowAddressModal(false)} className="text-gray-600 hover:text-gray-900"><ChevronLeft className="size-6" /></button>
              <h2 className="text-lg">Địa chỉ lấy hàng</h2>
              <div className="w-6" />
            </div>

            <LoadScript googleMapsApiKey="AIzaSyCz2FBTMfYNxhQ0v00ZYePs1b9gNGB1DD8" libraries={libraries}>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullname-addr">Họ và tên</Label>
                    <Input id="fullname-addr" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="phone-addr">Số điện thoại <span className="text-red-500">*</span></Label>
                    <Input 
                      id="phone-addr" 
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))} 
                      placeholder="0912345678" 
                      className={`mt-2 ${phoneError ? 'border-red-500' : ''}`}
                      maxLength={10} 
                    />
                    {phoneError && <p className="text-sm text-red-500 mt-1">{phoneError}</p>}
                  </div>
                </div>

                <div>
                  <Label>Tỉnh/Thành phố, Quận/Huyện, Phường/Xã</Label>
                  <button type="button" onClick={() => setShowLocationModal(true)} className="w-full mt-2 px-4 py-3 border-2 border-gray-200 rounded-lg text-left hover:border-gray-300 transition-all flex items-center justify-between">
                    <span className="text-gray-900">{province && district && ward ? `${province}, ${district}, ${ward}` : 'Chọn khu vực...'}</span>
                    <ChevronRight className="size-5 text-gray-400" />
                  </button>
                </div>

                <div>
                  <Label htmlFor="street-addr">Tên đường, Tòa nhà, Số nhà (Gợi ý tự động)</Label>
                  <Autocomplete 
                    onLoad={onLoadAutocomplete} 
                    onPlaceChanged={onPlaceChanged}
                    options={{ componentRestrictions: { country: 'vn' } }} 
                  >
                    <Input 
                      id="street-addr" 
                      value={street} 
                      onChange={(e) => setStreet(e.target.value)} 
                      placeholder="Nhập tên tòa nhà hoặc đường để tìm kiếm..." 
                      className="mt-2 border-blue-300 focus:border-blue-500 focus:ring-blue-500" 
                    />
                  </Autocomplete>
                </div>

                <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
                  <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={mapCenter} zoom={16} onClick={onMapClick}>
                    <Marker position={markerPosition} draggable={true} onDragEnd={onMapClick} />
                  </GoogleMap>
                </div>

                <div className="pt-4">
                  <Button type="button" onClick={handleSaveAddress} className="w-full h-12 bg-red-500 hover:bg-red-600">
                    LƯU VÀ XÁC NHẬN ĐỊA CHỈ
                  </Button>
                </div>
              </div>
            </LoadScript>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEmailModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <button onClick={() => setShowEmailModal(false)} className="text-gray-600 hover:text-gray-900"><ChevronLeft className="size-6" /></button>
              <h2 className="text-lg">Email</h2><div className="w-6" />
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="email-input">Email <span className="text-red-500">*</span></Label>
                <Input
                  id="email-input" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email của bạn"
                  className={`mt-2 ${emailError ? 'border-red-500' : ''}`}
                />
                {emailError && <p className="text-sm text-red-500 mt-1">{emailError}</p>}
              </div>

              <div className="pt-2">
                <Button onClick={handleConfirmEmail} className="w-full h-12 bg-red-500 hover:bg-red-600">
                  XÁC NHẬN EMAIL
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLocationModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <button type="button" onClick={() => setShowLocationModal(false)} className="text-gray-600 hover:text-gray-900"><ChevronLeft className="size-6" /></button>
              <h2 className="text-lg">Chọn khu vực</h2><div className="w-6" />
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="province-input">Tỉnh/Thành phố</Label>
                <select id="province-input" value={provinceCode} onChange={(e) => handleProvinceChange(e.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3">
                  <option value="">Chọn Tỉnh/Thành phố</option>
                  {provinces.map((item) => (<option key={item.code} value={item.code}>{item.name}</option>))}
                </select>
              </div>
              <div>
                <Label htmlFor="district-input">Quận/Huyện</Label>
                <select id="district-input" value={districtCode} onChange={(e) => void handleDistrictChange(e.target.value)} disabled={!province} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 disabled:opacity-60">
                  <option value="">Chọn Quận/Huyện</option>
                  {districts.map((item) => (<option key={item.code} value={item.code}>{item.name}</option>))}
                </select>
              </div>
              <div>
                <Label htmlFor="ward-input">Phường/Xã</Label>
                <select id="ward-input" value={wardCode} onChange={(e) => handleWardChange(e.target.value)} disabled={!district} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 disabled:opacity-60">
                  <option value="">Chọn Phường/Xã</option>
                  {wards.map((item) => (<option key={item.code} value={item.code}>{item.name}</option>))}
                </select>
              </div>
              <div className="pt-2">
                <Button type="button" onClick={() => setShowLocationModal(false)} className="w-full h-12 bg-red-500 hover:bg-red-600">XÁC NHẬN KHU VỰC</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}