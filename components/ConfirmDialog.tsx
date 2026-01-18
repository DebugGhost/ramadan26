'use client'

import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    confirmVariant?: 'danger' | 'primary'
    onConfirm: () => void
    onCancel: () => void
}

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'danger',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null)

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onCancel()
            }
        }
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, onCancel])

    // Focus trap
    useEffect(() => {
        if (isOpen && dialogRef.current) {
            dialogRef.current.focus()
        }
    }, [isOpen])

    if (!isOpen) return null

    const confirmButtonClass = confirmVariant === 'danger'
        ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-500/25 hover:shadow-red-500/40'
        : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-purple-500/25 hover:shadow-purple-500/40'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="relative bg-slate-800 border border-purple-500/30 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            >
                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${confirmVariant === 'danger'
                            ? 'bg-red-500/10 border-2 border-red-500/30'
                            : 'bg-purple-500/10 border-2 border-purple-500/30'
                        }`}>
                        <span className="text-3xl">
                            {confirmVariant === 'danger' ? '⚠️' : '❓'}
                        </span>
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white text-center mb-3">
                    {title}
                </h3>

                {/* Message */}
                <p className="text-gray-300 text-center mb-8 leading-relaxed">
                    {message}
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white font-semibold py-3 px-6 rounded-xl transition-all border border-purple-500/20"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] ${confirmButtonClass}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
