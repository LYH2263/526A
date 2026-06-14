import React, { useState } from 'react';

const StarRatingInput = ({ rating, onChange, size = 'lg', disabled = false }) => {
    const [hoverRating, setHoverRating] = useState(0);

    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-7 h-7',
        xl: 'w-8 h-8'
    };

    const starSize = sizeClasses[size] || sizeClasses.lg;
    const displayRating = hoverRating || rating || 0;

    const handleClick = (value) => {
        if (!disabled && onChange) {
            onChange(value);
        }
    };

    const handleMouseEnter = (value) => {
        if (!disabled) {
            setHoverRating(value);
        }
    };

    const handleMouseLeave = () => {
        if (!disabled) {
            setHoverRating(0);
        }
    };

    return (
        <div
            className={`flex items-center gap-1 ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
            onMouseLeave={handleMouseLeave}
        >
            {[1, 2, 3, 4, 5].map((value) => (
                <div
                    key={value}
                    onMouseEnter={() => handleMouseEnter(value)}
                    onClick={() => handleClick(value)}
                    className={`transition-transform ${!disabled ? 'hover:scale-110' : ''}`}
                >
                    <svg
                        className={`${starSize} ${value <= displayRating ? 'text-yellow-400' : 'text-gray-200'} ${!disabled ? 'transition-colors' : ''}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                </div>
            ))}
        </div>
    );
};

export default StarRatingInput;
