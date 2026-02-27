import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, Check, Plus, AlertTriangle, XCircle } from "lucide-react";
import { scanPrescriptionWithBackend } from '../../services/ocrService';
import Card from '../shared/Card';
import Button from '../shared/Button';

const PrescriptionScanner = ({ onDrugsExtracted, existingDrugs }) => {
    const [file, setFile] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("");
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [showRawText, setShowRawText] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const fileInputRef = useRef(null);

    const handleScan = async () => {
        if (!file) return;
        setScanning(true);
        setProgress(0);
        setError("");
        setResult(null);

        const res = await scanPrescriptionWithBackend(
            file,
            (p) => setProgress(p),
            (s) => setStatus(s)
        );

        setResult(res);
        setScanning(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped && dropped.type === "application/pdf") {
            setFile(dropped);
        } else {
            setError("Please upload a PDF file only.");
        }
    };

    const handleFileSelect = (e) => {
        const selected = e.target.files[0];
        if (selected && selected.size > 10 * 1024 * 1024) {
            setError("File too large. Max 10MB.");
            return;
        }
        if (selected) setFile(selected);
    };

    const resetScanner = () => {
        setFile(null);
        setResult(null);
        setProgress(0);
        setStatus("");
        setError("");
    };

    return (
        <Card className="p-0 overflow-hidden">
            {/* TOP SECTION — Upload Area */}
            {!scanning && !result && (
                <div className="p-6">
                    <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center ${dragOver ? 'bg-[#F0F9FF] border-[var(--color-primary)]' : 'bg-white border-[var(--color-border)]'}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                        />
                        <Upload size={40} className="mx-auto text-[#D1D1D6] mb-3" />
                        <p className="font-semibold text-[var(--color-primary)]">Upload Prescription</p>
                        <p className="text-sm text-[var(--color-text-muted)] mt-1">Drag and drop a PDF or click to browse</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-2">PDF files only · Max 10MB</p>

                        {file && (
                            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 mt-4 inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                                <FileText size={16} className="text-[var(--color-danger)]" />
                                <span className="text-sm font-medium ml-2 text-[var(--color-text-primary)] max-w-[200px] truncate">{file.name}</span>
                                <span className="text-xs text-[var(--color-text-muted)] ml-2">{(file.size / 1024).toFixed(0)} KB</span>
                                <button className="ml-3 text-[var(--color-text-muted)] hover:text-[var(--color-danger)]" onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}>
                                    ×
                                </button>
                            </div>
                        )}
                    </div>
                    {error && <p className="text-sm text-[var(--color-danger)] mt-3 text-center">{error}</p>}
                    {file && (
                        <Button className="w-full mt-4" onClick={handleScan}>
                            Scan Prescription
                        </Button>
                    )}
                </div>
            )}

            {/* Scanning Progress Section */}
            {scanning && (
                <div className="p-6">
                    <p className="text-sm font-medium mb-3 text-center text-[var(--color-text-primary)]">{status}</p>
                    <div className="w-full h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] text-center mt-2">{progress}%</p>
                    <div className="mt-4">
                        <div className="h-3 bg-[var(--color-surface)] rounded animate-pulse mb-2 w-3/4 mx-auto"></div>
                        <div className="h-3 bg-[var(--color-surface)] rounded animate-pulse mb-2 w-full mx-auto"></div>
                        <div className="h-3 bg-[var(--color-surface)] rounded animate-pulse mb-2 w-1/2 mx-auto"></div>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] text-center mt-3">Tesseract OCR is reading your prescription...</p>
                </div>
            )}

            {/* Result Section */}
            {!scanning && result && (
                <div className="p-6">
                    {result.success && result.drugs_found.length > 0 ? (
                        <>
                            <div className="flex items-center mb-4 flex-wrap gap-2">
                                <CheckCircle2 size={20} className="text-[#34C759]" />
                                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Prescription scanned successfully</h3>

                                {result.method_used === "openai_vision" && (
                                    <span className="inline-flex items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-2 py-0.5 text-xs ml-1 text-[var(--color-accent)]">
                                        ✨ OpenAI Vision
                                    </span>
                                )}
                                {(result.method_used === "tesseract_browser" || result.method_used === "tesseract_fallback") && (
                                    <span className="inline-flex items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-2 py-0.5 text-xs ml-1 text-[var(--color-text-muted)]">
                                        🔍 Browser OCR
                                    </span>
                                )}
                                <span className="text-xs text-[var(--color-text-muted)] ml-auto">{result.pages_processed} page(s) processed</span>
                            </div>

                            {result.method_used === "openai_vision" && (
                                <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg px-3 py-2 mb-4 flex items-center mt-2">
                                    <Check size={14} className="text-[#16A34A] shrink-0" />
                                    <p className="text-xs text-[#16A34A] ml-2">Analyzed by OpenAI Vision — high accuracy for medical text</p>
                                </div>
                            )}

                            <p className="text-[11px] uppercase text-[var(--color-text-muted)] font-semibold mb-3 tracking-wider">MEDICATIONS FOUND</p>

                            <div className="flex flex-wrap gap-2 mb-4">
                                {result.drugs_found.map(drug => {
                                    const alreadyAdded = existingDrugs.includes(drug);
                                    if (alreadyAdded) {
                                        return (
                                            <div key={drug} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-3 py-1.5 inline-flex items-center opacity-60">
                                                <Check size={12} className="text-[#34C759] mr-1" />
                                                <span className="text-sm text-[var(--color-text-muted)] capitalize">{drug}</span>
                                                <span className="text-[10px] text-[var(--color-text-muted)] ml-1.5">(Added)</span>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div key={drug} className="bg-white border border-[var(--color-primary)] rounded-full px-3 py-1.5 inline-flex items-center cursor-pointer hover:bg-[#F0F9FF] group" onClick={() => onDrugsExtracted([drug])}>
                                                <Plus size={12} className="text-[var(--color-primary)] mr-1 group-hover:scale-110 transition-transform" />
                                                <span className="text-sm font-medium text-[var(--color-text-primary)] capitalize">{drug}</span>
                                            </div>
                                        );
                                    }
                                })}
                            </div>

                            {(() => {
                                const newDrugs = result.drugs_found.filter(d => !existingDrugs.includes(d));
                                return (
                                    <div className="flex gap-2 mt-4">
                                        <Button
                                            className="flex-1"
                                            disabled={newDrugs.length === 0}
                                            onClick={() => onDrugsExtracted(newDrugs)}
                                        >
                                            Add All ({newDrugs.length} new)
                                        </Button>
                                        <Button variant="secondary" onClick={resetScanner}>
                                            Scan Another
                                        </Button>
                                    </div>
                                );
                            })()}

                            <div className="mt-5 border-t border-[var(--color-border)] pt-4">
                                <button className="text-xs text-[var(--color-primary)] cursor-pointer hover:underline mb-2" onClick={() => setShowRawText(!showRawText)}>
                                    {showRawText ? 'Hide extracted text' : 'Show extracted text'}
                                </button>
                                {showRawText && (
                                    <textarea
                                        className="w-full h-32 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-muted)] font-mono resize-none focus:outline-none"
                                        readOnly
                                        value={result.raw_text}
                                    />
                                )}
                            </div>

                            <div className="mt-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-3 py-2 flex items-center">
                                <AlertTriangle size={14} className="text-[#F59E0B] shrink-0" />
                                <p className="text-xs text-[#D97706] ml-2 leading-tight">OCR may miss some medications. Review and add any missing drugs manually.</p>
                            </div>
                        </>
                    ) : result.success && result.drugs_found.length === 0 ? (
                        <div className="text-center py-4">
                            <AlertTriangle size={32} className="mx-auto text-[#D1D1D6] mb-3" />
                            <h3 className="font-semibold text-[var(--color-text-primary)]">No medications detected</h3>
                            <p className="text-sm text-[var(--color-text-muted)] mx-auto max-w-[280px] mt-2">The OCR could not identify medication names in this prescription. Try a clearer scan or add medications manually.</p>
                            <Button variant="secondary" className="mt-5" onClick={resetScanner}>Try Again</Button>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <XCircle size={32} className="mx-auto text-[var(--color-danger)] mb-3" />
                            <h3 className="font-semibold text-[var(--color-text-primary)]">Scanning failed</h3>
                            <p className="text-sm text-[var(--color-text-muted)] mt-2">{error || result.error}</p>
                            <Button variant="secondary" className="mt-5" onClick={resetScanner}>Try Again</Button>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

export default PrescriptionScanner;
