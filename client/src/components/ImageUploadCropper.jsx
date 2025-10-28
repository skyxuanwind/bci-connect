import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { uploadImage } from '../services/nfcCards';
import toast from 'react-hot-toast';

// A lightweight image upload + optional center-crop helper.
// - Validates type and size
// - Optional aspect ratio center-crop via canvas (e.g., 1:1, 4:3, 16:9)
// - Shows local preview and per-file upload progress
// - Supports single or multiple uploads
//
// Props:
// - multiple: boolean
// - aspectRatio: number | null (e.g., 1 for square). If null, no crop.
// - maxSizeMB: number (default 5)
// - onUploaded: (urls: string[]) => void
// - onProgressChange?: (progress: number) => void  // overall progress (0-100)
// - label?: string
// - className?: string
//
export default function ImageUploadCropper({
  multiple = false,
  aspectRatio = null,
  maxSizeMB = 5,
  onUploaded,
  onProgressChange,
  label = '上傳圖片',
  className = '',
}) {
  const [files, setFiles] = useState([]); // {file, previewUrl}
  const [uploading, setUploading] = useState(false);
  const [progressMap, setProgressMap] = useState({}); // name -> 0..100
  const inputRef = useRef(null);

  const totalProgress = useMemo(() => {
    const names = Object.keys(progressMap);
    if (!names.length) return 0;
    const sum = names.reduce((acc, k) => acc + (progressMap[k] || 0), 0);
    return Math.round(sum / names.length);
  }, [progressMap]);

  useEffect(() => {
    if (onProgressChange) onProgressChange(totalProgress);
  }, [totalProgress, onProgressChange]);

  const reset = () => {
    setFiles([]);
    setProgressMap({});
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const validateFile = (file) => {
    const isImage = file.type && file.type.startsWith('image/');
    if (!isImage) {
      toast.error('僅支援圖片檔案');
      return false;
    }
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`圖片大小不可超過 ${maxSizeMB}MB`);
      return false;
    }
    return true;
  };

  const handleSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter(validateFile);
    if (!valid.length) return;
    const items = valid.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setFiles((prev) => (multiple ? [...prev, ...items] : items.slice(0, 1)));
  };

  const centerCropToAspect = async (file, aspect) => {
    if (!aspect) return file;
    const img = await createImageBitmap(file);
    const { width, height } = img;
    const targetAspect = aspect;
    let cropW = width;
    let cropH = Math.round(width / targetAspect);
    if (cropH > height) {
      cropH = height;
      cropW = Math.round(height * targetAspect);
    }
    const startX = Math.round((width - cropW) / 2);
    const startY = Math.round((height - cropH) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, startX, startY, cropW, cropH, 0, 0, cropW, cropH);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  };

  const removeFile = (name) => {
    setFiles((prev) => prev.filter((f) => f.file.name !== name));
    setProgressMap((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleUpload = useCallback(async () => {
    if (!files.length) {
      toast('請先選擇圖片');
      return;
    }
    setUploading(true);
    try {
      const urls = [];
      for (const item of files) {
        const cropped = await centerCropToAspect(item.file, aspectRatio);
        const url = await uploadImage(cropped, (pct) => {
          setProgressMap((prev) => ({ ...prev, [item.file.name]: pct }));
        });
        urls.push(url);
        setProgressMap((prev) => ({ ...prev, [item.file.name]: 100 }));
      }
      onUploaded(urls);
      toast.success('圖片上傳完成');
      reset();
    } catch (err) {
      console.error(err);
      toast.error('上傳失敗，請稍後重試');
      setUploading(false);
    }
  }, [files, aspectRatio, onUploaded]);

  return (
    <div className={`rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="font-medium text-gray-800">{label}</div>
        {uploading && (
          <div className="text-sm text-gray-600">整體進度：{totalProgress}%</div>
        )}
      </div>

      <div className="mt-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleSelect}
          className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-gray-200"
        />
        {aspectRatio && (
          <div className="mt-2 text-xs text-gray-500">將進行中心裁切，比例：{aspectRatio}:1</div>
        )}
      </div>

      {!!files.length && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {files.map(({ file, previewUrl }) => (
            <div key={file.name} className="relative overflow-hidden rounded-md border">
              <img src={previewUrl} alt={file.name} className="h-28 w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-black/50 p-2 text-xs text-white">
                <div className="flex items-center justify-between">
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(file.name)}
                    className="rounded bg-white/20 px-2 py-1 hover:bg-white/30"
                  >
                    移除
                  </button>
                </div>
                {uploading && (
                  <div className="mt-1 h-1 w-full rounded bg-white/20">
                    <div
                      className="h-1 rounded bg-green-400"
                      style={{ width: `${progressMap[file.name] || 0}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !files.length}
          className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {uploading ? '上傳中…' : '開始上傳'}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={uploading}
          className="inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 disabled:cursor-not-allowed"
        >
          清空
        </button>
      </div>
    </div>
  );
}