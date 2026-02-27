import React from 'react';
import { Loader2 } from "lucide-react";

const LoadingSpinner = ({ message }) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)]">
            <Loader2 size={24} className="animate-spin mb-4" color="var(--color-accent)" />
            {message && <p className="text-sm text-[var(--color-text-muted)]">{message}</p>}
        </div>
    );
};

export default LoadingSpinner;
