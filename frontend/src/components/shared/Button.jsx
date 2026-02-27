import React from 'react';

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
                <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                </svg>
            )}
            {children}
        </button>
    );
};

export default Button;
