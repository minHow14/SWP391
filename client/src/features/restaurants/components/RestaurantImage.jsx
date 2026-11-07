// D:/SWP391/SWP391/client/src/features/restaurants/components/RestaurantImage.jsx
import { useState } from 'react';
import '../styles/restaurantImage.css';
import {
  resolveRestaurantCategory,
  getRestaurantInitial,
  getRestaurantFallbackAriaLabel,
} from '../utils/restaurantImageHelpers.js';

/**
 * Biểu tượng SVG thanh nhã theo trường phái ẩm thực chay:
 * - Hoa sen: Chay Phật giáo
 * - Mầm cây đôi lá: Thuần chay (Vegan)
 * - Giỏ nông sản: Cửa hàng thực phẩm chay
 * - Âu cơm & đôi đũa: Cơm chay / Bếp chay riêng
 */
function VegetarianThemedIcon({ category }) {
  if (category === 'buddhist') {
    return (
      <svg
        className="cx-rest-fallback-svg"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M24 6C24 6 19 15 19 23C19 26.5 21 29 24 29C27 29 29 26.5 29 23C29 15 24 6 24 6Z"
          fill="#D97706"
          fillOpacity="0.85"
        />
        <path
          d="M19 23C15 18 8 20 8 26C8 30 13 33 19 31C18.5 28 18.5 25 19 23Z"
          fill="#B45309"
          fillOpacity="0.75"
        />
        <path
          d="M29 23C33 18 40 20 40 26C40 30 35 33 29 31C29.5 28 29.5 25 29 23Z"
          fill="#B45309"
          fillOpacity="0.75"
        />
        <path
          d="M24 30C16 30 11 35 11 39C11 41 14 42 24 42C34 42 37 41 37 39C37 35 32 30 24 30Z"
          fill="#92400E"
          fillOpacity="0.6"
        />
      </svg>
    );
  }

  if (category === 'vegan') {
    return (
      <svg
        className="cx-rest-fallback-svg"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M24 40C24 40 24 24 24 16M24 16C24 8 16 6 12 10C8 14 9 22 17 24C21 25 24 22 24 16ZM24 23C24 18 30 14 36 16C41 18 41 26 34 29C30 31 26 28 24 23Z"
          stroke="#059669"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17 21C14 18 13 14 14 12"
          stroke="#10B981"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (category === 'shop') {
    return (
      <svg
        className="cx-rest-fallback-svg"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M10 18H38L35 38H13L10 18Z"
          stroke="#0D9488"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M17 18V13C17 9.5 19.5 7 24 7C28.5 7 31 9.5 31 13V18"
          stroke="#0D9488"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M19 26C21 28 27 28 29 26"
          stroke="#14B8A6"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Mặc định: Bát cơm chay & đũa
  return (
    <svg
      className="cx-rest-fallback-svg"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8 22C8 31 15 38 24 38C33 38 40 31 40 22H8Z"
        fill="#15803D"
        fillOpacity="0.8"
      />
      <path
        d="M18 38L16 42H32L30 38"
        stroke="#15803D"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M10 16L38 12M14 19L38 16"
        stroke="#D97706"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Component hiển thị ảnh quán chay với fallback đồ họa chuyên nghiệp khi không có ảnh thật.
 * Tuân thủ quy tắc No Fake Stock Data: Không dùng ảnh stock vu vơ, hiển thị nhận diện thực vật rõ ràng.
 */
export default function RestaurantImage({
  src,
  alt = '',
  name = '',
  type = 'separate',
  dietTypeId = null,
  isShop = false,
  variant = 'card', // 'thumb' | 'card' | 'hero'
  className = '',
}) {
  const [hasError, setHasError] = useState(false);
  const restaurantName = name || alt || 'Quán Chay';
  const firstLetter = getRestaurantInitial(restaurantName, alt);
  const category = resolveRestaurantCategory({ type, dietTypeId, isShop });

  if (src && !hasError) {
    return (
      <div className={`cx-rest-img-frame is-${variant} ${className}`}>
        <img
          src={src}
          alt={alt || restaurantName}
          className="cx-rest-img-real"
          loading="lazy"
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`cx-rest-img-frame is-fallback is-${variant} is-${category} ${className}`}
      role="img"
      aria-label={getRestaurantFallbackAriaLabel(restaurantName, alt)}
    >
      <div className="cx-rest-fallback-backdrop">
        <div className="cx-rest-fallback-initial" aria-hidden="true">
          {firstLetter}
        </div>
        <div className="cx-rest-fallback-icon-wrap">
          <VegetarianThemedIcon category={category} />
        </div>
      </div>
      <div className="cx-rest-fallback-badge">
        <i className="bi bi-camera" aria-hidden="true" />
        <span>Chưa có ảnh thực tế</span>
      </div>
    </div>
  );
}
