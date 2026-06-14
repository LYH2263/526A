import React from 'react';

const StarRating = ({ rating, size = 'md', showValue = false, reviewCount = null }) => {
    const sizeClasses = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
        xl: 'w-6 h-6'
    };

    const starSize = sizeClasses[size] || sizeClasses.md;
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating || 0) % 1 >= 0.5;

    const renderStar = (index) => {
        const isFull = index < fullStars;
        const isHalf = !isFull && index === fullStars && hasHalfStar;

        return (
            <svg key={index} className={`${starSize} ${isFull || isHalf ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                {isHalf ? (
                    <>
                        <defs>
                            <linearGradient id={`half-${index}`}>
                                <stop offset="50%" stopColor="currentColor" />
                                <stop offset="50%" stopColor="#e5e7eb" />
                            </linearGradient>
                        </defs>
                        <path fill={`url(#half-${index})`} d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </>
                ) : (
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                )}
            </svg>
        );
    };

    return (
        <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
                {[0, 1, 2, 3, 4].map(renderStar)}
            </div>
            {showValue && (
                <span className="text-sm font-medium text-gray-700">
                    {rating ? Number(rating).toFixed(1) : '0.0'}
                </span>
            )}
            {reviewCount !== null && (
                <span className="text-xs text-gray-400">
                    ({reviewCount}条评价)
                </span>
            )}
        </div>
    );
};

export default StarRating;
