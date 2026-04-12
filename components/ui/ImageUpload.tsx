'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  preview: string | null;
  onFileSelect: (file: File) => void;
  onDelete: () => void;
  accept?: string;
  label?: string;
  sublabel?: string;
  aspectRatio?: string;
  className?: string;
}

export function ImageUpload({
  preview,
  onFileSelect,
  onDelete,
  accept = 'image/*',
  label = 'Upload image',
  sublabel,
  aspectRatio,
  className = '',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset input so same file can be selected again
    if (inputRef.current) inputRef.current.value = '';
  };

  if (preview) {
    return (
      <div className={`relative group rounded-xl overflow-hidden border border-gray-200 ${className}`}>
        <img
          src={preview}
          alt="Preview"
          className="w-full h-full object-cover"
          style={aspectRatio ? { aspectRatio } : undefined}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
          <button
            type="button"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg"
            title="Delete"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200
        ${isDragging
          ? 'border-pink-500 bg-pink-50/50 scale-[1.01]'
          : 'border-gray-300 hover:border-pink-400 hover:bg-pink-50/30'
        }
        flex flex-col items-center justify-center gap-3 p-8
        ${className}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
        isDragging ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-400'
      }`}>
        <Upload className="w-6 h-6" />
      </div>
      <div className="text-center">
        <p className={`text-sm font-medium ${isDragging ? 'text-pink-600' : 'text-gray-600'}`}>
          {label}
        </p>
        {sublabel && (
          <p className="text-xs text-gray-400 mt-1">{sublabel}</p>
        )}
      </div>
    </div>
  );
}
