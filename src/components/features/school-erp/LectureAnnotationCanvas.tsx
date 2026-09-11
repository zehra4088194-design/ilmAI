'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Undo, Redo, Eraser, Pen, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DRAW_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Black', value: '#1f2937' },
];

interface LectureAnnotationCanvasProps {
  imageUrl: string;
  onSave: (mergedImageUrl: string, highlightedRegions: any[]) => void;
  onCancel: () => void;
}

export function LectureAnnotationCanvas({ imageUrl, onSave, onCancel }: LectureAnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);
  const [brushColor, setBrushColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(6);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState<{ x: number; y: number } | null>(null);
  const [highlightedRegions, setHighlightedRegions] = useState<any[]>([]);
  const drawnBoundsRef = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);

  // Load image onto canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      // Save initial state
      historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
      historyIndexRef.current = 0;

      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Get canvas position relative to image coordinates
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Remove any states after current index (for new drawings)
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    historyIndexRef.current = historyRef.current.length - 1;

    // Limit history to 20 states
    if (historyRef.current.length > 20) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    historyIndexRef.current--;
    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    historyIndexRef.current++;
    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageLoaded) return;
    const coords = getCanvasCoords(e);

    isDrawingRef.current = true;
    lastPosRef.current = coords;

    // Start pan if holding space or right click
    if (e.button === 1 || (e as any).spacePressed) {
      setIsPanning(true);
      setLastPanPos({ x: e.clientX, y: e.clientY });
      return;
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !imageLoaded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);

    // Panning
    if (isPanning && lastPanPos) {
      const dx = e.clientX - lastPanPos.x;
      const dy = e.clientY - lastPanPos.y;
      setOffsetX((prev) => prev + dx);
      setOffsetY((prev) => prev + dy);
      setLastPanPos({ x: e.clientX, y: e.clientY });
      return;
    }

    const radius = brushSize / 2;
    const previousBounds = drawnBoundsRef.current;
    drawnBoundsRef.current = {
      minX: Math.min(previousBounds?.minX ?? coords.x, coords.x - radius),
      minY: Math.min(previousBounds?.minY ?? coords.y, coords.y - radius),
      maxX: Math.max(previousBounds?.maxX ?? coords.x, coords.x + radius),
      maxY: Math.max(previousBounds?.maxY ?? coords.y, coords.y + radius),
    };

    // Drawing
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
    }

    ctx.beginPath();
    if (lastPosRef.current) {
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    }
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastPosRef.current = coords;
  };

  const stopDrawing = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPosRef.current = null;
      saveState();
    }
    if (isPanning) {
      setIsPanning(false);
      setLastPanPos(null);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get merged image URL
    const mergedImageUrl = canvas.toDataURL('image/jpeg', 0.9);

    const bounds = drawnBoundsRef.current;
    const regions = bounds
      ? [{
          x: Math.max(0, bounds.minX),
          y: Math.max(0, bounds.minY),
          w: Math.min(canvas.width, bounds.maxX) - Math.max(0, bounds.minX),
          h: Math.min(canvas.height, bounds.maxY) - Math.max(0, bounds.minY),
          label: 'Annotated Region',
          color: brushColor,
        }]
      : [];

    onSave(mergedImageUrl, regions);
  };

  if (!imageLoaded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="text-center text-white">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
          <p className="mt-4">Loading image...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-900 px-4 py-3">
        <h2 className="text-lg font-semibold text-white">Annotate Photo</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleUndo} disabled={historyIndexRef.current <= 0} className="bg-gray-800 text-white hover:bg-gray-700">
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleRedo} disabled={historyIndexRef.current >= historyRef.current.length - 1} className="bg-gray-800 text-white hover:bg-gray-700">
            <Redo className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700">
            <Download className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 border-b border-gray-700 bg-gray-900 px-4 py-2">
        {/* Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTool('pen')}
            className={`rounded-lg p-2 ${tool === 'pen' ? 'bg-blue-600' : 'bg-gray-800'} hover:bg-gray-700`}
          >
            <Pen className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`rounded-lg p-2 ${tool === 'eraser' ? 'bg-blue-600' : 'bg-gray-800'} hover:bg-gray-700`}
          >
            <Eraser className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="h-8 w-px bg-gray-700" />

        {/* Colors */}
        <div className="flex items-center gap-2">
          {DRAW_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => {
                setBrushColor(color.value);
                setTool('pen');
              }}
              className={`h-8 w-8 rounded-full border-2 transition ${
                brushColor === color.value && tool === 'pen' ? 'border-white scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>

        <div className="h-8 w-px bg-gray-700" />

        {/* Brush Size */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Size:</span>
          <input
            type="range"
            min="2"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-sm text-white">{brushSize}px</span>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 overflow-auto bg-gray-950">
        <div
          className="relative mx-auto my-8"
          style={{
            transform: `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`,
            transformOrigin: 'center center',
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onContextMenu={(e) => e.preventDefault()}
            className="cursor-crosshair"
            style={{
              maxWidth: '90vw',
              maxHeight: 'calc(100vh - 200px)',
              touchAction: 'none',
            }}
          />
        </div>
      </div>

      {/* Footer hint */}
      <div className="border-t border-gray-700 bg-gray-900 px-4 py-2 text-center text-sm text-gray-400">
        Draw on the photo to highlight important areas • Use mouse wheel to zoom • Right-click drag to pan
      </div>
    </div>
  );
}
