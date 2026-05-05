import React from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ArrowProps {
  onClick?: () => void;
}

const NextArrow = ({ onClick }: ArrowProps) => (
  <button
    onClick={onClick}
    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 size-10 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all"
  >
    <ChevronRight className="size-5 text-gray-800" />
  </button>
);

const PrevArrow = ({ onClick }: ArrowProps) => (
  <button
    onClick={onClick}
    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 size-10 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all"
  >
    <ChevronLeft className="size-5 text-gray-800" />
  </button>
);

export default function HeroCarousel() {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    dotsClass: 'slick-dots !bottom-4',
    customPaging: () => (
      <div className="size-2 bg-white/60 rounded-full hover:bg-white transition-all" />
    ),
  };

  const slides = [
    {
      id: 1,
      title: 'Đón hè sang - Deal xinh ngập tràn',
      discount: '50%',
      minPrice: '99.000đ',
      discount2: '20%',
      image: '/src/imports/image-7.png',
    },
    {
      id: 2,
      title: 'Flash Sale hôm nay',
      discount: '80.000đ',
      image: '/src/imports/image-6.png',
    },
    {
      id: 3,
      title: 'Freeship 0đ',
      discount: '18%',
      image: '/src/imports/image.png',
    },
  ];

  return (
    <div className="relative rounded-lg overflow-hidden shadow-lg">
      <Slider {...settings}>
        {slides.map((slide) => (
          <div key={slide.id} className="outline-none">
            <div className="relative h-[400px]">
              <ImageWithFallback
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}
