import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

interface UploadZoneProps {
  disabled: boolean;
  onFile: (file: File) => void;
}

export function UploadZone({ disabled, onFile }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = "";
  };

  const dropFile = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      className={`upload-zone ${isDragging ? "is-dragging" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={dropFile}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        onChange={selectFile}
        hidden
      />
      <div className="upload-icon" aria-hidden="true">
        ↑
      </div>
      <div>
        <strong>Arraste o ZIP do Instagram aqui</strong>
        <p>ou selecione o arquivo exportado em formato JSON</p>
      </div>
      <button
        className="primary-button"
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {disabled ? "Analisando…" : "Selecionar ZIP"}
      </button>
    </div>
  );
}
