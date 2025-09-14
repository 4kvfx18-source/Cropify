import React, { useState } from 'react';
import type { Crop } from '../types';
import { Icon } from './Icon';

declare var JSZip: any;

interface CropListProps {
  crops: Crop[];
  onRemoveCrop: (cropId: string) => void;
}

const downloadFile = (content: string | Blob, fileName: string, contentType?: string) => {
  const blob = typeof content === 'string' ? new Blob([content], { type: contentType }) : content;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
};

const CropItem: React.FC<{ crop: Crop; onRemove: () => void }> = ({ crop, onRemove }) => {
  const { metadata, thumbnailUrl } = crop;
  const cropName = `${metadata.originalFileName}_crop_${String(metadata.cropNumber).padStart(4, '0')}`;

  const handleDownloadImage = () => {
    const a = document.createElement("a");
    a.href = crop.imageDataUrl;
    a.download = `${cropName}.png`;
    a.click();
  };

  const handleDownloadJson = () => {
    downloadFile(JSON.stringify(crop.metadata, null, 2), `${cropName}.json`, 'application/json');
  };

  return (
    <div className="bg-gray-700 p-3 rounded-lg flex items-center gap-4 transition-all hover:bg-gray-600">
      <img src={thumbnailUrl} alt={cropName} className="w-16 h-16 rounded-md object-contain bg-gray-800/50" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{cropName}.png</p>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleDownloadImage}
            title="Download PNG"
            className="p-1.5 text-gray-300 bg-blue-600 hover:bg-blue-500 rounded-full transition-colors"
          >
            <Icon name="download" className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownloadJson}
            title="Download JSON"
            className="p-1.5 text-gray-300 bg-green-600 hover:bg-green-500 rounded-full transition-colors"
          >
            <span className="font-bold text-xs">JSON</span>
          </button>
        </div>
      </div>
      <button
        onClick={onRemove}
        title="Remove Crop"
        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-500/20 rounded-full transition-colors"
      >
        <Icon name="trash" className="w-5 h-5" />
      </button>
    </div>
  );
};


export const CropList: React.FC<CropListProps> = ({ crops, onRemoveCrop }) => {
  const [isZipping, setIsZipping] = useState(false);

  const handleBatchDownload = async () => {
    if (crops.length === 0 || isZipping || typeof JSZip === 'undefined') {
      if (typeof JSZip === 'undefined') {
        console.error("JSZip library is not loaded.");
      }
      return;
    }
    setIsZipping(true);
    
    try {
      const zip = new JSZip();
      
      for (const crop of crops) {
        const { metadata, imageDataUrl } = crop;
        const cropName = `${metadata.originalFileName}_crop_${String(metadata.cropNumber).padStart(4, '0')}`;
        
        zip.file(`${cropName}.json`, JSON.stringify(metadata, null, 2));
        
        const base64Data = imageDataUrl.split(',')[1];
        zip.file(`${cropName}.png`, base64Data, { base64: true });
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const originalFileName = crops[0]?.metadata?.originalFileName || 'cropify';
      downloadFile(zipBlob, `${originalFileName}_crops.zip`);
    
    } catch (error) {
      console.error("Failed to create ZIP archive:", error);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-bold text-white">Crops ({crops.length})</h2>
        <button
            onClick={handleBatchDownload}
            disabled={crops.length === 0 || isZipping}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            title={crops.length > 0 ? "Download all crops as a ZIP file" : "No crops to download"}
        >
            <Icon name="download" className="w-4 h-4" />
            {isZipping ? 'Zipping...' : 'Batch Download'}
        </button>
      </div>
      {crops.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <Icon name="crop" className="w-16 h-16 text-gray-600 mb-4" />
            <p className="text-gray-500">Your cropped images will appear here.</p>
            <p className="text-xs text-gray-600 mt-2">Use the tools on the canvas to start cropping.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {crops.map((crop) => (
            <CropItem key={crop.id} crop={crop} onRemove={() => onRemoveCrop(crop.id)} />
          ))}
        </div>
      )}
    </div>
  );
};