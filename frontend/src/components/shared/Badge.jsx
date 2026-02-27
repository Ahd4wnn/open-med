import React from 'react';

const Badge = ({ label, color = 'gray', className = '' }) => {
    const colorStyles = {
        red: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
        yellow: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
        green: "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]",
        gray: "bg-[#F5F5F7] text-[#6E6E73] border-[#E5E5EA]",
        blue: "bg-[#F0F9FF] text-[#0284C7] border-[#BAE6FD]"
    };

    const selectedStyle = colorStyles[color] || colorStyles.gray;

    return (
        <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full border uppercase tracking-wide ${selectedStyle} ${className}`}>
            {label}
        </span>
    );
};

export default Badge;
