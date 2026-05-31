import React, { useRef, useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, Upload, Power, RefreshCw, Layers } from 'lucide-react';

interface CameraScannerProps {
  onCapture: (base64Image: string, optionalQuery?: string) => void;
  status: 'idle' | 'scanning' | 'thinking' | 'success' | 'error';
  activeBoard: string;
}

export default function CameraScanner({ onCapture, status, activeBoard }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [customText, setCustomText] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);

  // Hardware maker presets with full Ukrainian support to test the neural vision
  const PRESETS = [
    {
      name: "Плата ESP32 DevKit",
      query: "Ідентифікуй та розпиши основні виводи I2C для підключення стандартного OLED SSD1306 на цій платі ESP32.",
      url: "https://images.unsplash.com/photo-1553406830-ef2513450d76?w=400&q=80" // microcontroller board
    },
    {
      name: "Датчик DHT22 / AM2302",
      query: "Які виводи тримають конфігурацію підтягуючого резистора і як правильно запаяти сенсор вологості DHT22?",
      url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80" // chip/electronics circuit
    },
    {
      name: "Схема Резисторів",
      query: "Визнач резистори на макетній платі за кольором смужок та запропонуй високоточну металоплівкову заміну.",
      url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80" // resistor board
    }
  ];

  // Stop camera stream safely
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  // Start micro camera stream
  const startCamera = async () => {
    setCameraError(null);
    setUploadedPreview(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'environment' }
      });
      setStream(mediaStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn("Camera media access failed: ", err);
      setCameraError("Не вдалося отримати доступ до камери або дозвіл було відхилено. Будь ласка, скористайтеся завантаженням фото.");
      setCameraActive(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stream]);

  // Handle capture frame drawing in canvas
  const handleCapture = () => {
    if (!cameraActive || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (context) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      onCapture(dataUrl, customText);
    }
  };

  // Handle file picker attachments
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setUploadedPreview(result);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  // Run Preset Emulator — fetch the remote image and convert it to a base64 data
  // URI so the vision endpoint receives valid image data (not a bare URL).
  const applyPreset = async (preset: typeof PRESETS[0]) => {
    stopCamera();
    setCustomText(preset.query);
    try {
      const res = await fetch(preset.url);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => setUploadedPreview(reader.result as string);
      reader.readAsDataURL(blob);
    } catch (err) {
      console.warn('Не вдалося завантажити прев\'ю пресета, використовую URL напряму', err);
      setUploadedPreview(preset.url);
    }
  };

  const handleSendUploaded = () => {
    if (uploadedPreview) {
      onCapture(uploadedPreview, customText);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="p-1 px-2.5 rounded text-xs bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono tracking-widest uppercase">
            ОПТИКА-ОБ'ЄКТИВ
          </div>
          <h3 className="text-sm font-medium text-slate-100 tracking-tight font-sans">
            Оптичний Зір J.V.S. Vision Lens
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {!cameraActive ? (
            <button
              onClick={startCamera}
              className="px-3 py-1 text-xs rounded-md bg-cyan-600 hover:bg-cyan-500 font-mono text-white transition-all flex items-center gap-1.5 shadow"
            >
              <Power className="w-3 h-3" /> Увімкнути поток
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="px-3 py-1 text-xs rounded-md bg-rose-600 hover:bg-rose-500 font-mono text-white transition-all flex items-center gap-1.5 shadow"
            >
              <Power className="w-3 h-3" /> Вимкнути
            </button>
          )}
        </div>
      </div>

      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-950 border border-slate-850 flex flex-col items-center justify-center">
        {cameraActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* HUD / Align Overlay */}
            <div className="absolute inset-0 pointer-events-none border-[16px] border-slate-950/25 flex flex-col justify-between p-4">
              <div className="flex justify-between">
                <div className="w-6 h-6 border-t-2 border-l-2 border-cyan-400 opacity-80" />
                <div className="w-6 h-6 border-t-2 border-r-2 border-cyan-400 opacity-80" />
              </div>
              
              {/* Target Crosshairs */}
              <div className="self-center flex items-center justify-center relative">
                <div className="absolute w-8 h-8 rounded-full border border-dashed border-cyan-400/40 animate-ping" />
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              </div>

              <div className="flex justify-between">
                <div className="w-6 h-6 border-b-2 border-l-2 border-cyan-400 opacity-80" />
                <div className="w-6 h-6 border-b-2 border-r-2 border-cyan-400 opacity-80" />
              </div>
            </div>
            
            <div className="absolute bottom-2 left-2 bg-slate-900/95 border border-slate-800 text-[10px] font-mono py-0.5 px-2 rounded text-cyan-400/90 tracking-wide">
              FPS: 30 | RES: 640x480 | GAIN: AUTO
            </div>
          </>
        ) : uploadedPreview ? (
          <div className="relative w-full h-full">
            <img
              src={uploadedPreview}
              alt="Uploaded Electronic Component Preview"
              className="w-full h-full object-contain bg-slate-900/60"
              referrerPolicy="no-referrer"
            />
            <button
              onClick={() => {
                setUploadedPreview(null);
                setCustomText('');
              }}
              className="absolute top-2 right-2 p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-xs text-rose-400 border border-slate-700 transition"
              title="Clear Upload"
            >
              Видалити фото
            </button>
            <div className="absolute bottom-2 left-2 bg-slate-900/95 border border-cyan-800/40 text-[10px] font-mono py-0.5 px-2 rounded text-cyan-400/90 tracking-wide flex items-center gap-1">
              <Layers className="w-3 h-3" /> ОПТИКО-ВІЗУАЛЬНИЙ ЗНІМОК ПІДГОТОВЛЕНО
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 w-full h-full">
            <div className="p-3 bg-slate-900 rounded-full border border-slate-800 mb-2">
              <Camera className="w-8 h-8 text-cyan-400/60" />
            </div>
            <p className="text-xs text-slate-300 font-medium">Сфотографуйте ваші деталі, контакти пайки або плату</p>
            <p className="text-[11px] text-slate-500 max-w-sm mt-1">
              Розташуйте ваші мікросхеми, датчики чи паяні з'єднання перед об'єктивом або завантажте їх знімок для автоматичного детектування.
            </p>

            <div className="mt-4 flex flex-wrap gap-2.5 justify-center">
              <label className="px-3.5 py-1.5 rounded-md bg-slate-850 hover:bg-slate-800 border border-slate-700/80 cursor-pointer text-xs font-mono text-cyan-400 transition flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Завантажити фотографію
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <button
                onClick={startCamera}
                className="px-3.5 py-1.5 rounded-md bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono text-cyan-400 transition flex items-center gap-1.5"
              >
                <Power className="w-3.5 h-3.5" /> Активувати камеру
              </button>
            </div>

            {cameraError && (
              <p className="mt-3 text-[10.5px] text-amber-500 max-w-xs">{cameraError}</p>
            )}
          </div>
        )}
      </div>

      {canvasRef && <canvas ref={canvasRef} className="hidden" />}

      {/* Preset emulations when they don't have parts available on desk */}
      {!cameraActive && !uploadedPreview && (
        <div className="mt-4">
          <p className="text-[11px] font-mono text-slate-500 uppercase tracking-widest mb-2">
            🔬 Симулювати Діагностичні Шаблони Деталей
          </p>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => applyPreset(p)}
                className="text-left p-2.5 border border-slate-800/80 hover:border-cyan-800/40 bg-slate-950/40 hover:bg-slate-900 rounded-lg text-xs transition duration-200"
              >
                <p className="text-[11px] font-semibold text-slate-300 truncate">{p.name}</p>
                <p className="text-[9px] text-slate-500 mt-0.5 max-w-full truncate">{p.query}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Query text modifier */}
      <div className="mt-4 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
        <label className="block text-[10.5px] font-mono text-slate-400 uppercase tracking-wider mb-1">
          Спеціальні вказівки для аналізу зору (необов'язково)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="наприклад: Визнач порти GPIO, підкажи куди паяти резистор 10к..."
            className="flex-1 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 text-xs text-slate-200 px-3 py-1.5 rounded outline-none transition"
          />
          {cameraActive ? (
            <button
              onClick={handleCapture}
              disabled={status === 'thinking'}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-xs font-mono font-bold text-white rounded transition flex items-center gap-1 focus:ring-1 focus:ring-cyan-400"
            >
              Аналізувати Кадр Камери
            </button>
          ) : uploadedPreview ? (
            <button
              onClick={handleSendUploaded}
              disabled={status === 'thinking'}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-xs font-mono font-bold text-white rounded transition flex items-center gap-1 focus:ring-1 focus:ring-cyan-400"
            >
              Аналізувати фотографію
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
