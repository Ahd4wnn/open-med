import React from 'react';

const Card = ({ children, className = '', padding = 'p-6', onClick }) => {
    const isClickable = !!onClick;

    return (
        <div
            onClick={onClick}
            className={`bg-white border border-[var(--color-border)] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] 
        ${padding} ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow duration-200' : ''} 
        ${className}`}
        >
            {children}
        </div>
    );
};

export default Card;
