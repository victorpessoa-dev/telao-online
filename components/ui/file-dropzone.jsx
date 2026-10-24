"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

export function FileDropzone({
  accept,
  disabled = false,
  onFileSelect,
  title = "Arraste um arquivo ou clique para enviar",
  description = "",
  className = "",
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const selectFile = (file) => {
    if (file) onFileSelect?.(file);
  };

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) selectFile(event.dataTransfer.files?.[0]);
        }}
        className={`flex min-h-24 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-4 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-input bg-muted/20 hover:border-primary/60 hover:bg-muted/40"
        }`}
      >
        <UploadCloud className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium">{title}</span>
        {description ? (
          <span className="text-xs text-muted-foreground">{description}</span>
        ) : null}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          selectFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
