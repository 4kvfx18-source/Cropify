import React, { useState, useRef } from 'react';
import { CanvasEditor, CanvasEditorHandles } from './components/CanvasEditor';
import { CropList } from './components/CropList';
import { Icon } from './components/Icon';
import type { Crop, Selection, Rectangle } from './types';
import { SelectionMode } from './types';

function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(SelectionMode.Rectangle);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [cropCounter, setCropCounter] = useState(1);
  const editorRef = useRef<CanvasEditorHandles>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (imageFile) {
        if (!window.confirm("Loading a new image will discard all current crops. Are you sure?")) {
          return;
        }
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target?.result as string);
        setCrops([]);
        setSelection(null);
        setCropCounter(1);
      };
      reader.readAsDataURL(file);
      e.target.value = ''; // Allow re-uploading the same file
    }
  };
  
  const createThumbnail = (imageDataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 128;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const hRatio = size / img.width;
                const vRatio = size / img.height;
                const ratio = Math.min(hRatio, vRatio);
                const centerShiftX = (size - img.width * ratio) / 2;
                const centerShiftY = (size - img.height * ratio) / 2;
                ctx.clearRect(0, 0, size, size);
                ctx.drawImage(img, 0, 0, img.width, img.height,
                                centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);
            }
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = imageDataUrl;
    });
  };

  const handleCrop = async (imageDataUrl: string, cropSelection: Selection) => {
    if (!imageFile || !cropSelection) return;
    
    const thumbnailUrl = await createThumbnail(imageDataUrl);

    const newCrop: Crop = {
      id: new Date().toISOString() + Math.random(),
      imageDataUrl,
      thumbnailUrl,
      metadata: {
        originalFileName: imageFile.name.split('.').slice(0, -1).join('.'),
        cropNumber: cropCounter,
        mode: selectionMode,
        selection: cropSelection,
      },
    };
    setCrops(prev => [newCrop, ...prev]);
    setCropCounter(prev => prev + 1);
  };
  
  const handleRemoveCrop = (cropId: string) => {
    setCrops(prev => prev.filter(c => c.id !== cropId));
  };
  
  const undoLastPoint = () => {
    if (Array.isArray(selection) && selection.length > 0) {
      setSelection(selection.slice(0, -1));
    }
  };

  const clearSelection = () => {
    setSelection(null);
  };

  const handleChangeSelectionMode = (mode: SelectionMode) => {
    setSelectionMode(mode);
    setSelection(null);
  };

  const isCropDisabled = !selection || 
    (selectionMode === SelectionMode.Rectangle && (!selection || (selection as Rectangle).width === 0 || (selection as Rectangle).height === 0)) ||
    (selectionMode === SelectionMode.Polygon && (!Array.isArray(selection) || selection.length < 3));

  const ToolbarButton = ({
    icon,
    label,
    onClick,
    isActive = false,
    disabled = false,
    className = '',
  }: {
    icon: string;
    label: string;
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`p-2 rounded-md transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'text-gray-300 hover:bg-gray-700'
      } disabled:text-gray-500 disabled:bg-transparent disabled:cursor-not-allowed ${className}`}
    >
      <Icon name={icon} className="w-6 h-6" />
    </button>
  );

  if (!imageSrc) {
    return (
      <div className="bg-gray-800 text-white h-screen flex flex-col items-center justify-center">
        <div className="text-center p-8 border-2 border-dashed border-gray-600 rounded-xl max-w-md">
            <Icon name="crop" className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Cropify</h1>
            <p className="text-gray-400 mb-6">A simple tool for cropping images with rectangles or polygons. Upload an image to get started.</p>
            <label className="px-6 py-3 bg-blue-600 text-white rounded-md font-semibold cursor-pointer hover:bg-blue-500 transition-colors inline-flex items-center gap-2">
                <Icon name="upload" className="w-5 h-5" />
                <span>Select Image</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 text-white h-screen flex flex-col">
      <header className="bg-gray-900/50 backdrop-blur-sm p-2 flex justify-between items-center border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold px-2 flex items-center gap-2"><Icon name="crop" className="w-6 h-6 text-blue-500" />Cropify</h1>
            <div className="w-px h-6 bg-gray-700" />
            <ToolbarButton
                icon="rectangle"
                label="Rectangle"
                onClick={() => handleChangeSelectionMode(SelectionMode.Rectangle)}
                isActive={selectionMode === SelectionMode.Rectangle}
            />
            <ToolbarButton
                icon="polygon"
                label="Polygon"
                onClick={() => handleChangeSelectionMode(SelectionMode.Polygon)}
                isActive={selectionMode === SelectionMode.Polygon}
            />
            <div className="w-px h-6 bg-gray-700" />
            <ToolbarButton
                icon="undo"
                label="Undo last point"
                onClick={undoLastPoint}
                disabled={selectionMode !== SelectionMode.Polygon || !Array.isArray(selection) || selection.length === 0}
            />
            <ToolbarButton
                icon="clear"
                label="Clear selection"
                onClick={clearSelection}
                disabled={!selection}
            />
            <ToolbarButton
                icon="crop"
                label="Crop"
                onClick={() => editorRef.current?.crop()}
                disabled={isCropDisabled}
                className="!text-green-400 disabled:!text-gray-500 hover:!bg-green-500/20"
            />
             <div className="w-px h-6 bg-gray-700" />
            <ToolbarButton
                icon="zoomIn"
                label="Zoom In"
                onClick={() => editorRef.current?.zoomIn()}
            />
            <ToolbarButton
                icon="zoomOut"
                label="Zoom Out"
                onClick={() => editorRef.current?.zoomOut()}
            />
            <ToolbarButton
                icon="resetZoom"
                label="Reset View"
                onClick={() => editorRef.current?.resetView()}
            />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400 truncate max-w-xs" title={imageFile?.name}>{imageFile?.name}</span>
          <label className="px-3 py-1.5 bg-gray-700 text-white rounded-md text-sm font-semibold cursor-pointer hover:bg-gray-600 transition-colors">
              <span>Change Image</span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-black relative">
            <CanvasEditor 
              ref={editorRef}
              imageSrc={imageSrc} 
              selectionMode={selectionMode}
              onCrop={handleCrop}
              selection={selection}
              setSelection={setSelection}
            />
        </div>
        <aside className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <CropList crops={crops} onRemoveCrop={handleRemoveCrop} />
        </aside>
      </main>
    </div>
  );
}

export default App;