import React from 'react';
import { Loader2 } from "lucide-react";

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    onClick,
    type = 'button',
    className = '',
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200";

    const sizeStyles = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2.5 text-sm",
        lg: "px-6 py-3 text-base"
    };

    const variantStyles = {
        primary: "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]",
        secondary: "bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[#EBEBED]",
        danger: "bg-[var(--color-danger)] text-white hover:opacity-90",
        ghost: "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
    };

    const currentStyles = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`;

    return (
        <button
            type={type}
            onClick={loading ? undefined : onClick}
            disabled={disabled || loading}
            className={currentStyles}
            {...props}
        >
            {loading && (
                <Loader2 size={14} className="animate-spin -ml-1 mr-2 text-current" />
            )}
            {children}
        </button>
    );
};

export default Button;
