/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, Check, Info, Hammer, Zap, Play } from 'lucide-react';
import { MakerProject, ComponentPin, SolderConnection } from '../types';

// Pre-define Board Pin coordinates for SVG vector boards (0 - 100 percentage coordinates)
const ARDUINO_PINS: ComponentPin[] = [
  { name: '5V', type: 'power', x: 25, y: 15, description: 'Основна шина живлення 5В' },
  { name: '3.3V', type: 'power', x: 32, y: 15, description: 'Стабілізоване живлення 3.3В для сенсорів' },
  { name: 'GND', type: 'ground', x: 40, y: 15, description: 'Основне заземлення системи GND' },
  { name: 'A0', type: 'analog', x: 55, y: 15, description: 'Аналоговий вхід ADC0 (датчики напруги)' },
  { name: 'A4', type: 'communication', x: 70, y: 15, description: 'Шина даних I2C SDA (Analog 4)' },
  { name: 'A5', type: 'communication', x: 78, y: 15, description: 'Шина частоти I2C SCL (Analog 5)' },
  { name: 'D2', type: 'digital', x: 25, y: 85, description: 'Цифровий порт вводу-виводу GPIO 2' },
  { name: 'D3', type: 'digital', x: 32, y: 85, description: 'Цифровий порт GPIO 3 з підтримкою ШІМ' },
  { name: 'D9', type: 'digital', x: 55, y: 85, description: 'Цифровий порт GPIO 9 з підтримкою ШІМ' },
  { name: 'D10', type: 'digital', x: 62, y: 85, description: 'Цифровий порт GPIO 10 (SPI SS вибір чіпа)' },
  { name: 'D11', type: 'communication', x: 70, y: 85, description: 'Шина SPI MOSI (передача даних до дисплея)' },
  { name: 'D12', type: 'communication', x: 78, y: 85, description: 'Шина SPI MISO (прийом даних)' },
  { name: 'D13', type: 'communication', x: 86, y: 85, description: 'Шина SPI SCK (такт шини, вбудований світлодіод)' },
];

const ESP32_PINS: ComponentPin[] = [
  { name: '3V3', type: 'power', x: 15, y: 12, description: 'Стабілізований вихід 3.3В лінії живлення' },
  { name: 'GND', type: 'ground', x: 15, y: 22, description: 'Основне заземлення системи GND' },
  { name: 'GPIO21 (SDA)', type: 'communication', x: 15, y: 38, description: 'Шина I2C SERIAL DATA (дані сенсорів)' },
  { name: 'GPIO22 (SCL)', type: 'communication', x: 15, y: 48, description: 'Шина I2C SERIAL CLOCK (синхронізація)' },
  { name: 'TXD', type: 'communication', x: 15, y: 64, description: 'Серійний порт UART TX (передача відладки)' },
  { name: 'RXD', type: 'communication', x: 15, y: 74, description: 'Серійний порт UART RX (прийом команд)' },
  { name: 'GND2', type: 'ground', x: 85, y: 12, description: 'Друга точка спільної землі GND верстата' },
  { name: '5V', type: 'power', x: 85, y: 22, description: 'Пряме живлення 5В від шини USB VBUS' },
  { name: 'GPIO32', type: 'analog', x: 85, y: 38, description: 'Аналоговий вхід ADC1 канал 32 для вологості' },
  { name: 'GPIO33', type: 'analog', x: 85, y: 48, description: 'Аналоговий вхід ADC1 канал 33' },
  { name: 'GPIO14', type: 'digital', x: 85, y: 64, description: 'Загальний цифровий порт вводу-виводу GPIO14' },
  { name: 'GPIO27', type: 'digital', x: 85, y: 74, description: 'Загальний цифровий порт вводу-виводу GPIO27' },
];

const RP_PICO_PINS: ComponentPin[] = [
  { name: 'GP0 (I2C SDA)', type: 'communication', x: 15, y: 15, description: 'Основний канал шини I2C0 SDA' },
  { name: 'GP1 (I2C SCL)', type: 'communication', x: 15, y: 25, description: 'Основний канал шини I2C0 SCL' },
  { name: 'GND', type: 'ground', x: 15, y: 40, description: 'Точка заземлення конусу плати 1' },
  { name: 'GP4', type: 'digital', x: 15, y: 60, description: 'Цифровий вивід вводу-виводу GPIO 4' },
  { name: 'ADC0', type: 'analog', x: 15, y: 75, description: 'Аналоговий вхід АЦП з низьким рівнем шумів' },
  { name: '3V3_OUT', type: 'power', x: 85, y: 15, description: 'Стабілізований вивід 3.3В внутрішнього стабілізатора' },
  { name: 'VBUS', type: 'power', x: 85, y: 30, description: 'Силова шина 5В від USB порту Pico' },
  { name: 'GND2', type: 'ground', x: 85, y: 45, description: 'Додаткова точка заземлення конусу плати 2' },
  { name: 'GP16', type: 'digital', x: 85, y: 65, description: 'Цифровий вивід загального призначення 16' },
  { name: 'GP17', type: 'digital', x: 85, y: 80, description: 'Цифровий вивід загального призначення 17' },
];

interface PinoutVisualizerProps {
  project: MakerProject;
  onToggleConnection: (connId: string) => void;
}

export default function PinoutVisualizer({ project, onToggleConnection }: PinoutVisualizerProps) {
  const [hoveredPin, setHoveredPin] = useState<ComponentPin | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<SolderConnection | null>(null);

  // Get correct board pin layouts
  const getBoardPins = (): ComponentPin[] => {
    switch (project.boardType) {
      case 'arduino': return ARDUINO_PINS;
      case 'rpipico': return RP_PICO_PINS;
      case 'esp32':
      default:
        return ESP32_PINS;
    }
  };

  const pins = getBoardPins();
  const totalConns = project.connections.length;
  const completedConns = project.connections.filter(c => c.status === 'completed').length;
  const percentComplete = totalConns > 0 ? Math.round((completedConns / totalConns) * 100) : 0;

  // Render SVG connections mapped from high-tech board pins to target components
  const renderInteractiveConnections = () => {
    return project.connections.map((conn) => {
      // Find matching pin on the board schematic coordinates
      const matchedPin = pins.find(p => p.name.toLowerCase() === conn.fromPin.toLowerCase());
      if (!matchedPin) return null;

      // Make a neat curve line to simulated component locations on the far right
      const startX = matchedPin.x;
      const startY = matchedPin.y;
      
      // Calculate index offset for components to scatter destination wires nicely
      const elementIdx = project.components.findIndex(c => c.id === conn.toComponentId);
      const scatteredOffset = 30 + (elementIdx >= 0 ? elementIdx * 20 : 10);
      const endX = 92; // fixed visualization output node column on right
      const endY = scatteredOffset;

      const strokeCol = conn.color || '#06b6d4';
      const isSelected = selectedConnection?.id === conn.id;
      const isCompleted = conn.status === 'completed';

      return (
        <g key={conn.id} className="cursor-pointer" onClick={() => setSelectedConnection(conn)}>
          {/* Animated signal pulse along the wire paths */}
          {!isCompleted && (
            <path
              d={`M ${startX * 5} ${startY * 3} C ${(startX + 20) * 5} ${startY * 3}, ${(endX - 20) * 5} ${endY * 3}, ${endX * 5} ${endY * 3}`}
              fill="none"
              stroke={strokeCol}
              strokeWidth="4"
              strokeDasharray="10 10"
              className="opacity-40 animate-[dash_2.5s_linear_infinite]"
              style={{ strokeDashoffset: 100 }}
            />
          )}

          {/* Solid insulated core wire path */}
          <path
            d={`M ${startX * 5} ${startY * 3} C ${(startX + 20) * 5} ${startY * 3}, ${(endX - 20) * 5} ${endY * 3}, ${endX * 5} ${endY * 3}`}
            fill="none"
            stroke={strokeCol}
            strokeWidth={isSelected ? '3.5' : '2'}
            className={`transition-all duration-300 ${isCompleted ? 'opacity-90' : 'opacity-70'} hover:opacity-100 hovering-wire`}
          />

          {/* End-node custom soldering joints */}
          <circle
            cx={endX * 5}
            cy={endY * 3}
            r={isSelected ? "6" : "4.5"}
            fill={isCompleted ? "#c0c0c0" : "#475569"} // silver solder vs inactive dark pad
            stroke={isCompleted ? "#10b981" : "#1e293b"}
            strokeWidth="1.5"
          />
        </g>
      );
    });
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md">
      
      {/* Splay Header with Soldering System Parameters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-slate-100 font-sans uppercase flex items-center gap-2">
            <Hammer className="w-4 h-4 text-cyan-400" /> Схема Пайки та З'єднань
          </h3>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            ПРОТОТИП ПЛАТИ: <span className="text-cyan-400 font-bold uppercase">{project.boardType} Ревізія v1</span>
          </p>
        </div>
        
        {/* Soldering Iron Telemetry Block */}
        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="block text-[9px] text-[#71717a] uppercase tracking-wider">ТЕМП СТАНЦІЇ</span>
            <span className="text-cyan-400 font-bold">330°C</span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="block text-[9px] text-[#71717a] uppercase tracking-wider">СТАТУС ЗБІРКИ</span>
            <span className="text-emerald-400 font-bold">{percentComplete}% ({completedConns}/{totalConns})</span>
          </div>
        </div>
      </div>

      {/* SVG Interactive Microcontroller Board Visualization */}
      <div className="relative bg-slate-950 rounded-xl border border-slate-850 p-4 overflow-x-auto flex justify-center items-center">
        <svg 
          viewBox="0 0 500 300" 
          width="100%" 
          height="100%" 
          className="min-w-[450px] max-w-[550px] aspect-[5/3] overflow-visible select-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
        >
          {/* Main PCB Frame backdrop body */}
          <rect x="50" y="25" width="300" height="250" rx="14" fill="#022c22" stroke="#059669" strokeWidth="3" className="shadow-inner" />
          <rect x="58" y="32" width="284" height="236" fill="none" stroke="#34d399" strokeWidth="0.5" strokeDasharray="3 3" className="opacity-25" />

          {/* Core Central IC / Chip Processing Unit */}
          {project.boardType === 'esp32' ? (
            <g>
              <rect x="150" y="90" width="100" height="120" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
              <rect x="160" y="96" width="80" height="40" fill="#334155" rx="2" />
              <text x="200" y="120" fill="#e2e8f0" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">ESP32-S3</text>
              <circle cx="200" cy="180" r="15" fill="none" stroke="#22d3ee" strokeWidth="0.5" className="animate-pulse" />
            </g>
          ) : project.boardType === 'rpipico' ? (
            <g>
              <rect x="160" y="100" width="80" height="100" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
              <rect x="180" y="130" width="40" height="40" fill="#334155" rx="2" />
              <text x="200" y="154" fill="#e2e8f0" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">RP2040</text>
            </g>
          ) : (
            <g>
              <rect x="180" y="80" width="50" height="140" fill="#1e293b" stroke="#475569" strokeWidth="1" />
              <text x="205" y="154" fill="#64748b" fontSize="8" fontFamily="monospace" transform="rotate(-90 205 154)" textAnchor="middle">ATMEGA328P</text>
            </g>
          )}

          {/* Copper ground/power traces visual accents */}
          <path d="M 80,100 L 140,100 L 140,150 M 320,200 L 260,200" fill="none" stroke="#10b981" strokeWidth="1.5" className="opacity-20" />

          {/* Render Vector Board Header pins */}
          {pins.map((pin) => {
            const isHovered = hoveredPin?.name === pin.name;
            const isPinPower = pin.type === 'power';
            const isPinGnd = pin.type === 'ground';

            return (
              <g 
                key={pin.name}
                onMouseEnter={() => setHoveredPin(pin)}
                onMouseLeave={() => setHoveredPin(null)}
                className="cursor-help transition"
              >
                {/* Custom Solder Copper ring */}
                <circle
                  cx={pin.x * 5}
                  cy={pin.y * 3}
                  r="6.5"
                  fill="#b45309" // amber-700 copper color
                  stroke="#fbbf24"
                  strokeWidth={isHovered ? "1.5" : "0.5"}
                  className="transition duration-150"
                />
                
                {/* Center Pin Hole */}
                <circle
                  cx={pin.x * 5}
                  cy={pin.y * 3}
                  r="3"
                  fill={isPinPower ? "#ef4444" : isPinGnd ? "#000000" : "#fbbf24"} // logic-level power/ground representation
                />

                {/* Solder connection highlighted indicator directly on pins */}
                {project.connections.some(conn => conn.fromPin.toLowerCase() === pin.name.toLowerCase() && conn.status === 'completed') && (
                  <circle
                    cx={pin.x * 5}
                    cy={pin.y * 3}
                    r="4.5"
                    fill="#e2e8f0" // bright silver soldered blob
                    stroke="#10b981"
                    strokeWidth="0.75"
                  />
                )}

                {/* Pin labels offset nicely */}
                <text
                  x={pin.x * 5}
                  y={pin.y * 3 + (pin.y < 50 ? 12 : -10)}
                  fill={isHovered ? "#22d3ee" : "#cbd5e1"}
                  fontSize="7"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="pointer-events-none"
                >
                  {pin.name}
                </text>
              </g>
            );
          })}

          {/* Render Animated Connections Layer */}
          {renderInteractiveConnections()}

          {/* Sidebar fake visual targets representation (sensors / elements on right) */}
          <g transform="translate(434, 0)">
            <rect x="0" y="20" width="60" height="260" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <text x="30" y="14" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">ВУЗЛИ</text>

            {project.components.map((comp, idx) => {
              const compY = 30 + (idx * 20); // match scattered offset logic above
              return (
                <g key={comp.id}>
                  {/* Miniature sensor chip box representation */}
                  <rect x="6" y={compY * 3 - 10} width="48" height="20" rx="3" fill="#0f172a" stroke="#475569" strokeWidth="0.5" />
                  <text 
                    x="30" 
                    y={compY * 3 + 2} 
                    fill="#38bdf8" 
                    fontSize="7" 
                    fontFamily="monospace" 
                    textAnchor="middle"
                    className="truncate max-w-[42px] font-bold"
                  >
                    {comp.name.substring(0, 8)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Diagnostic pinpoint readout bubble */}
        {hoveredPin && (
          <div className="absolute top-2 left-2 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-left select-none text-[10.5px] font-mono z-10 max-w-xs shadow-lg">
            <p className="text-cyan-400 font-bold">ПІН: {hoveredPin.name}</p>
            <p className="text-slate-400 text-[10px] leading-tight mt-0.5">{hoveredPin.description}</p>
            <p className="text-[#a1a1aa] text-[9px] mt-0.5 uppercase">Тип: <span className="text-white">{hoveredPin.type === 'power' ? 'Живлення' : hoveredPin.type === 'ground' ? 'Земля' : hoveredPin.type === 'analog' ? 'Аналог' : hoveredPin.type === 'communication' ? 'Шина' : 'Цифровий'}</span></p>
          </div>
        )}
      </div>

      {/* Solder connections controller list */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Connection List */}
        <div>
          <h4 className="text-xs font-mono tracking-wider text-[#a1a1aa] uppercase mb-2 flex items-center gap-1.5 border-b border-slate-800 pb-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Контактні Точки Пайки / Чеклист
          </h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {project.connections.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                Сер, немає призначених з'єднань. Скористайтеся камерою або автономним пошуком.
              </p>
            ) : (
              project.connections.map((conn) => (
                <div
                  key={conn.id}
                  onClick={() => setSelectedConnection(conn)}
                  className={`p-2 rounded border text-left transition duration-150 cursor-pointer text-xs ${
                    selectedConnection?.id === conn.id
                      ? 'bg-slate-800 border-cyan-800'
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: conn.color }}
                      />
                      <span className="font-mono text-[11px] text-slate-200">
                        {conn.fromPin} ➔ {conn.toComponentPin}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleConnection(conn.id);
                      }}
                      className={`p-1 rounded text-[10px] font-mono flex items-center gap-0.5 border ${
                        conn.status === 'completed'
                          ? 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                      }`}
                    >
                      {conn.status === 'completed' ? <Check className="w-2.5 h-2.5" /> : null}
                      {conn.status === 'completed' ? 'Припаяно' : 'Паяти'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 pl-4 italic truncate">
                    {conn.purpose}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Connection Joint Telemetry/Guide Details */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-850 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-mono tracking-wider text-[#a1a1aa] uppercase mb-2 flex items-center gap-1.5 border-b border-slate-800 pb-1">
              <Info className="w-3.5 h-3.5 text-cyan-400" /> Телеметрія З'єднання та Поради
            </h4>
            
            {selectedConnection ? (
              <div className="text-left space-y-2">
                <div>
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Цільовий вузол</p>
                  <p className="text-xs font-semibold text-slate-200">{selectedConnection.toComponentId}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-mono text-slate-500 uppercase">Контакт Контролера</p>
                    <p className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-900 inline-block">
                      {selectedConnection.fromPin}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-slate-500 uppercase">Порт Модуля</p>
                    <p className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900 inline-block">
                      {selectedConnection.toComponentPin}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Призначення з'єднання</p>
                  <p className="text-xs text-slate-300 mt-0.5">{selectedConnection.purpose}</p>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-xs text-center italic py-8 flex flex-col items-center justify-center">
                <Play className="w-5 h-5 text-slate-600 mb-1.5 animate-pulse" />
                <p>Оберіть будь-яку лінію чи площадку на схемі для детальної діагностики та порад.</p>
              </div>
            )}
          </div>
          
          {/* Quick Tip Footer */}
          <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] font-sans text-[#a1a1aa] flex items-center gap-1.5 leading-tight">
            <span className="p-0.5 rounded bg-cyan-950 text-cyan-400 font-mono text-[9px] font-bold uppercase">ПОРАДА J.V.S.:</span>
            <span>Нанесіть флюс на майданчик, паяйте при 320-345°C. Очистіть кінчик жала перед контактом.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
