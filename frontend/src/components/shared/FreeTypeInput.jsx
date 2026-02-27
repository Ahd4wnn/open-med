import React, { useState } from 'react';
import { X } from 'lucide-react';

const FreeTypeInput = ({
    selectedItems = [],
    onAdd,
    onRemove,
    placeholder = "e.g. warfarin, metformin...",
    label,
    sublabel,
    confirmationText = "✓ {count} medication(s) ready",
    minCount = 1,
    className = "",
    hideChips = false
}) => {
    const [inputValue, setInputValue] = useState("");

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = inputValue.trim().replace(/,+$/, ''); // remove trailing comma
            if (val && !selectedItems.includes(val)) {
                if (onAdd) onAdd(val);
            }
            setInputValue("");
        } else if (e.key === 'Backspace' && inputValue === '') {
            if (selectedItems.length > 0) {
                if (onRemove) onRemove(selectedItems[selectedItems.length - 1]);
            }
        }
    };

    return (
        <div className={`w-full ${className}`}>
            {label && (
                <h3 className="text-[11px] uppercase tracking-wider text-[#86868B] font-semibold mb-3">
                    {label}
                </h3>
            )}
            {sublabel && (
                <p className="text-xs text-[#86868B] mb-3">
                    {sublabel}
                </p>
            )}

            <input
                className="w-full border border-[#EBEBED] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] transition-all"
                placeholder={placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                    const val = inputValue.trim().replace(/,+$/, '');
                    if (val && !selectedItems.includes(val)) {
                        if (onAdd) onAdd(val);
                    }
                    setInputValue("");
                }}
            />

            {!hideChips && selectedItems.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {selectedItems.map((item, idx) => (
                        <div key={`${item}-${idx}`} className="bg-white border border-[#EBEBED] rounded-full px-3 py-1.5 inline-flex items-center shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9] mr-2"></span>
                            <span className="text-sm font-medium text-[#1D1D1F] capitalize">{item}</span>
                            <button
                                onClick={() => onRemove && onRemove(item)}
                                className="ml-2 text-[#86868B] hover:text-[#FF3B30] focus:outline-none"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {selectedItems.length >= minCount && confirmationText && (
                <p className="text-xs font-medium text-[#34C759] mt-2">
                    {confirmationText.replace('{count}', selectedItems.length)}
                </p>
            )}
        </div>
    );
};

export default FreeTypeInput;
