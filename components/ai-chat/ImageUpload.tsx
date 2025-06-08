import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImageIcon, X } from 'lucide-react';

interface ImageUploadProps {
  onImageUpload: (base64: string) => void;
  onImageRemove: () => void;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUpload,
  onImageRemove,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // 处理图片选择
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
      alert('只支持JPG和PNG格式的图片');
      return;
    }

    // 检查文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }

    // 创建文件读取器
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPreview(base64);
      onImageUpload(base64);
    };
    reader.readAsDataURL(file);
  };

  // 清除选择的图片
  const handleClearImage = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImageRemove();
  };

  // 触发文件选择
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png"
        className="hidden"
        disabled={disabled}
      />
      
      {!preview ? (
        // 上传按钮
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={handleButtonClick}
          disabled={disabled}
          title="上传图片"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      ) : (
        // 图片预览
        <div className="relative inline-block">
          <img
            src={preview}
            alt="预览"
            className="h-20 w-auto max-w-[200px] rounded-md object-cover"
          />
          <button
            onClick={handleClearImage}
            className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white shadow-sm"
            disabled={disabled}
            title="删除图片"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUpload; 