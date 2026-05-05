const CATEGORY_ICON_STORAGE_KEY = 'category_icon_map_v1';

function readIconMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CATEGORY_ICON_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, string>;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function writeIconMap(map: Record<string, string>) {
  localStorage.setItem(CATEGORY_ICON_STORAGE_KEY, JSON.stringify(map));
}

export function getCategoryIcon(categoryId: string): string | null {
  const iconMap = readIconMap();
  return iconMap[categoryId] || null;
}

export function setCategoryIcon(categoryId: string, icon: string) {
  const iconMap = readIconMap();
  iconMap[categoryId] = icon;
  writeIconMap(iconMap);
}

export function removeCategoryIcon(categoryId: string) {
  const iconMap = readIconMap();
  delete iconMap[categoryId];
  writeIconMap(iconMap);
}

export function guessCategoryIcon(categoryName: string): string {
  const value = categoryName.trim().toLowerCase();

  if (
    value.includes('máy tính') ||
    value.includes('linh kiện') ||
    value.includes('cpu') ||
    value.includes('ram') ||
    value.includes('vga') ||
    value.includes('computer') ||
    value.includes('laptop')
  ) {
    return '💻';
  }

  if (value.includes('điện tử') || value.includes('điện thoại') || value.includes('tablet')) {
    return '📱';
  }

  if (value.includes('thời trang') || value.includes('quần') || value.includes('áo') || value.includes('giày')) {
    return '👕';
  }

  if (value.includes('nội thất') || value.includes('nhà')) {
    return '🛋️';
  }

  if (value.includes('làm đẹp') || value.includes('mỹ phẩm')) {
    return '💄';
  }

  if (value.includes('thực phẩm') || value.includes('đồ ăn')) {
    return '🍕';
  }

  if (value.includes('đồ chơi') || value.includes('game')) {
    return '🎮';
  }

  if (value.includes('sách')) {
    return '📚';
  }

  if (value.includes('thể thao')) {
    return '⚽';
  }

  return '📦';
}
