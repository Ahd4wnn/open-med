import React from 'react';

const Input = ({
    label,
    type = 'text',
    placeholder,
    value,
    onChange,
    error,
    hint,
    required,
    disabled,
    name,
    id,
    className = '',
    ...props
}) => {
    const inputId = id || name;

    return (
        <div className={`flex flex-col gap-1.5 w-full ${className}`}>
            {label && (
                <label
                    htmlFor={inputId}
                    className="text-[11px] uppercase tracking-wider font-medium text-[var(--color-text-muted)]"
                >
                    {label} {required && <span className="text-[var(--color-danger)]">*</span>}
                </label>
            )}
            <input
                id={inputId}
                name={name}
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                disabled={disabled}
                required={required}
                className={`w-full px-4 py-2.5 text-sm rounded-lg border bg-white text-[var(--color-text-primary)] 
          transition-colors duration-200 outline-none
          ${error
                        ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-1 focus:ring-[var(--color-danger)]'
                        : 'border-[var(--color-border)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]'
                    }
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}
        `}
                {...props}
            />
            {error && (
                <p className="text-xs text-[var(--color-danger)] mt-0.5">{error}</p>
            )}
            {hint && !error && (
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{hint}</p>
            )}
        </div>
    );
};

export default Input;
