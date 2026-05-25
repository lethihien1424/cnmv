import React from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

import { ChevronLeft, ChevronRight } from 'lucide-react';

// IMPORT ẢNH
import img1 from '../../imports/image-7.jpg';
import img2 from '../../imports/image-6.jpg';
import img3 from '../../imports/image.png';

interface ArrowProps {
  onClick?: () => void;
}

// Nút Next
const NextArrow = ({ onClick }: ArrowProps) => (
  <button
    onClick={onClick}
    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 size-10 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all"
  >
    <ChevronRight className="size-5 text-gray-800" />
  </button>
);

// Nút Prev
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
     
      image: img1,
    },
    {
      id: 2,
      
      image: img2,
    },
    {
      id: 3,
      
      image: img3,
    },
  ];

  return (
    <div className="relative rounded-lg overflow-hidden shadow-lg">
      <Slider {...settings}>
        {slides.map((slide) => (
          <div key={slide.id} className="outline-none">
            <div className="relative h-[400px]">
              <img
                src={slide.image}
                
                className="w-full h-full object-cover"
              />

              {/* Overlay */}
          <div className="absolute inset-0 bg-black/5 flex items-center">
                <div className="text-white px-10">
                  <h2 className="text-4xl font-bold mb-4">
                   
                  </h2>

                  
                </div>
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}