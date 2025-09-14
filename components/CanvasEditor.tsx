import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Point, Rectangle, Selection, SelectionMode } from '../types';

interface CanvasEditorProps {
  imageSrc: string | null;
  selectionMode: SelectionMode;
  onCrop: (dataUrl: string, selection: Selection) => void;
  selection: Point[] | Rectangle | null;
  setSelection: React.Dispatch<React.SetStateAction<Selection>>;
}

export interface CanvasEditorHandles {
  crop: () => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export const CanvasEditor = forwardRef<CanvasEditorHandles, CanvasEditorProps>(({
  imageSrc,
  selectionMode,
  onCrop,
  selection,
  setSelection,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPoint, setStartPanPoint] = useState<Point>({ x: 0, y: 0 });

  const resetView = (img: HTMLImageElement | null = image) => {
    if (!containerRef.current || !img) return;
    const container = containerRef.current;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const scaleX = containerWidth / img.width;
    const scaleY = containerHeight / img.height;
    const initialZoom = Math.min(scaleX, scaleY) * 0.95;
    
    setZoom(initialZoom);

    const initialPanX = (containerWidth - img.width * initialZoom) / 2;
    const initialPanY = (containerHeight - img.height * initialZoom) / 2;
    setPan({ x: initialPanX, y: initialPanY });
  };

  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        setImage(img);
      };
    } else {
      setImage(null);
    }
  }, [imageSrc]);

  useEffect(() => {
    if(image) {
        resetView(image);
    }
  }, [image]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    ctx.drawImage(image, 0, 0);

    // Draw selection
    if (selection) {
      ctx.strokeStyle = '#0ea5e9'; // sky-500
      ctx.fillStyle = 'rgba(14, 165, 233, 0.2)';
      ctx.lineWidth = 2 / zoom;
      
      if (Array.isArray(selection)) { // Polygon
        if (selection.length > 0) {
          ctx.beginPath();
          ctx.moveTo(selection[0].x, selection[0].y);
          for (let i = 1; i < selection.length; i++) {
            ctx.lineTo(selection[i].x, selection[i].y);
          }
          if (selectionMode === SelectionMode.Polygon && selection.length > 2) {
            ctx.closePath();
          }
          ctx.stroke();
          ctx.fill();
        }
      } else { // Rectangle
        const rect = selection as Rectangle;
        const x = rect.width > 0 ? rect.x : rect.x + rect.width;
        const y = rect.height > 0 ? rect.y : rect.y + rect.height;
        const w = Math.abs(rect.width);
        const h = Math.abs(rect.height);
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.stroke();
        ctx.fill();
      }
    }
    
    ctx.restore();
  }, [image, zoom, pan, selection, selectionMode]);

  const getMousePos = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!image) return;
    
    if (e.button === 1 || e.ctrlKey) {
      setIsPanning(true);
      setStartPanPoint({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
      return;
    }
    
    const pos = getMousePos(e);

    if (selectionMode === SelectionMode.Rectangle) {
      setSelection({ x: pos.x, y: pos.y, width: 0, height: 0 });
    } else if (selectionMode === SelectionMode.Polygon) {
        if (!Array.isArray(selection)) {
            setSelection([pos]);
        } else {
            // Close polygon if clicking near the start point
            if (selection.length > 2) {
                const firstPoint = selection[0];
                const dist = Math.sqrt(Math.pow(pos.x - firstPoint.x, 2) + Math.pow(pos.y - firstPoint.y, 2));
                if (dist < 10 / zoom) {
                    handleCrop();
                    return;
                }
            }
            setSelection([...selection, pos]);
        }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPanPoint.x, y: e.clientY - startPanPoint.y });
      return;
    }

    if (!selection || Array.isArray(selection) || e.buttons !== 1) return;
    
    if (selectionMode === SelectionMode.Rectangle) {
      const pos = getMousePos(e);
      const rect = selection as Rectangle;
      setSelection({
        ...rect,
        width: pos.x - rect.x,
        height: pos.y - rect.y,
      });
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
        setIsPanning(false);
    }
  };
  
  const adjustZoom = (scaleAmount: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const newZoom = Math.max(0.1, Math.min(zoom * scaleAmount, 10));
    
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const mousePointX = (centerX - pan.x) / zoom;
    const mousePointY = (centerY - pan.y) / zoom;

    const newPanX = centerX - mousePointX * newZoom;
    const newPanY = centerY - mousePointY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleAmount = e.deltaY > 0 ? 1/1.1 : 1.1;
    adjustZoom(scaleAmount);
  };
  
  const handleCrop = () => {
    if (!image || !selection) return;

    const cropCanvas = document.createElement('canvas');
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return;

    let minX: number, minY: number, width: number, height: number;
    let normalizedSelection = selection;

    if (Array.isArray(selection)) { // Polygon
      if (selection.length < 3) return;
      minX = Math.min(...selection.map(p => p.x));
      minY = Math.min(...selection.map(p => p.y));
      width = Math.max(...selection.map(p => p.x)) - minX;
      height = Math.max(...selection.map(p => p.y)) - minY;
    } else { // Rectangle
        const rect = selection as Rectangle;
        minX = Math.min(rect.x, rect.x + rect.width);
        minY = Math.min(rect.y, rect.y + rect.height);
        width = Math.abs(rect.width);
        height = Math.abs(rect.height);
        normalizedSelection = { x: minX, y: minY, width, height };
    }
    
    if (width <= 0 || height <= 0) return;

    cropCanvas.width = width;
    cropCanvas.height = height;

    if (Array.isArray(selection)) {
        cropCtx.beginPath();
        cropCtx.moveTo(selection[0].x - minX, selection[0].y - minY);
        for(let i = 1; i < selection.length; i++) {
            cropCtx.lineTo(selection[i].x - minX, selection[i].y - minY);
        }
        cropCtx.closePath();
        cropCtx.clip();
    }
    
    cropCtx.drawImage(image, -minX, -minY);

    onCrop(cropCanvas.toDataURL('image/png'), normalizedSelection);
    setSelection(null);
  };

  useImperativeHandle(ref, () => ({
      crop: handleCrop,
      resetView: () => resetView(image),
      zoomIn: () => adjustZoom(1.2),
      zoomOut: () => adjustZoom(1/1.2),
  }));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCrop();
        } else if (e.key === 'Escape') {
            setSelection(null);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selection, image, setSelection, handleCrop]);

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-900 relative overflow-hidden touch-none" onWheel={handleWheel}>
      {imageSrc && (
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      )}
      {!imageSrc && (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>Upload an image to start cropping</p>
        </div>
      )}
    </div>
  );
});