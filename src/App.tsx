/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Terminal, 
  Search, 
  Plus, 
  AlertCircle, 
  Cpu, 
  Clock, 
  Activity, 
  Flame, 
  Layers, 
  Database,
  Volume2, 
  VolumeX,
  Mic,
  HelpCircle, 
  BookOpen, 
  Compass, 
  CornerDownRight,
  ExternalLink,
  RefreshCw,
  Sliders,
  Brain,
  CheckCircle,
  Lightbulb,
  Cpu as Chip,
  BookOpen as Book,
  Check,
  Flame as Fire,
  PlusCircle,
  HelpCircle as Question,
  CheckSquare,
  AlertTriangle
} from 'lucide-react';
import { MakerProject, CustomComponent, SolderConnection, ChatMessage, SystemHistoryLog } from './types';
import JarvisCore from './components/JarvisCore';
import CameraScanner from './components/CameraScanner';
import PinoutVisualizer from './components/PinoutVisualizer';
import HologramViewer, { HologramSpec } from './components/HologramViewer';
import { useLiveConversation } from './hooks/useLiveConversation';

// Описи компонентів українською мовою з детальними інструкціями для JARVIS
// Порожньо за замовчуванням — схема пайки наповнюється РЕАЛЬНИМИ деталями,
// коли JARVIS розпізнає їх через камеру або пошук. Жодних демо-заглушок.
const INITIAL_COMPONENTS: CustomComponent[] = [];

const INITIAL_CONNECTIONS: SolderConnection[] = [];

// Інтерактивна Довідкова База Знань асистента
interface KnowledgeBaseEntry {
  id: string;
  name: string;
  category: 'component' | 'tool' | 'material';
  description: string;
  bestPractices: string;
  safeTemp?: string;
  sources?: string[];
}

const INITIAL_KNOWLEDGE_BASE: KnowledgeBaseEntry[] = [
  {
    id: 'kb-esp32',
    name: 'ESP32 DevKitC v4 (ESP-WROOM-32)',
    category: 'component',
    description: 'Потужна плата мікроконтролера з вбудованим Wi-Fi та Bluetooth. Робоча напруга чіпа становить 3.3В.',
    bestPractices: 'Рекомендується живити через вивід 3V3 стабільним джерелом, уникати перевищення напруги на виводах GPIO. Контролювати тривалість нагріву контактів.',
    safeTemp: '320°C - 340°C',
    sources: ['Офіційна документація Espressif Systems']
  },
  {
    id: 'kb-dht22',
    name: 'Датчик температури та вологості DHT22 / AM2302',
    category: 'component',
    description: 'Цифровий датчик з ємнісним сенсором вологості та високоточним термістором.',
    bestPractices: 'Потребує обов\'язкового підтягуючого резистора номіналом 4.7кОм - 10кОм між лініями VCC та DATA.',
    safeTemp: '300°C - 325°C',
    sources: ['Технічний архів датчиків Aosong']
  },
  {
    id: 'kb-ssd1306',
    name: 'Дисплей OLED SSD1306 128x64 I2C',
    category: 'component',
    description: 'Енергоефективний графічний дисплей на тонкому склі з вбудованим драйвером SSD1306.',
    bestPractices: 'Плата схильна до перегріву та вигорання пікселів. Не застосовуйте надмірний тиск жалом паяльника при фіксації роз\'ємів.',
    safeTemp: '310°C - 330°C',
    sources: ['Datasheet на драйвер Solomon Systech']
  },
  {
    id: 'kb-iron',
    name: 'Цифровий паяльник TS100 / TS101 / Pinecil',
    category: 'tool',
    description: 'Паяльна станція у формі ручки з мікропроцесорним контролем температури, термосенсором та OLED-екраном.',
    bestPractices: 'Пайку SMD радіодеталей виконувати зрізаним жалом типу "Chisel" 1.6мм. Використовувати функцію авто-сну для збереження жала.',
    safeTemp: 'Діапазон нагріву: 100°C - 450°C'
  },
  {
    id: 'kb-flux',
    name: 'Безочищувальний паяльний флюс AMTECH NC-559-ASM',
    category: 'tool',
    description: 'Високоякісний гелеподібний флюс для пайки BGA та SMD радіокомпонентів. Запобігає окисленню контактів.',
    bestPractices: 'Наносити тонким шаром безпосередньо перед нагріванням. Залишки флюсу є повністю неактивними, але рекомендується змивати ізопропіловим спиртом.',
    safeTemp: 'Температура активації: 140°C'
  },
  {
    id: 'kb-solder-leaded',
    name: 'Свинцево-олов\'яний припій Sn63Pb37 (ПОС-61)',
    category: 'material',
    description: 'Евтектичний паяльний сплав з оловом (63%) та свинцем (37%), плавиться рівномірно при 183°C.',
    bestPractices: 'Створює відмінні блискучі паяні з\'єднання, має чудову текучість. Найкращий вибір для початкового конструювання.',
    safeTemp: 'Оптимальна робоча температура: 310°C - 330°C'
  },
  {
    id: 'kb-solder-leadfree',
    name: 'Безсвинцевий сплав SAC305 (Sn96.5Ag3.0Cu0.5)',
    category: 'material',
    description: 'Екологічно безпечний промисловий припій з додаванням срібла та міді. Температура плавлення 217°C.',
    bestPractices: 'Вимагає використання більш агресивних активованих флюсів та вищої температури жала паяльної станції через гірші змочуючі якості.',
    safeTemp: 'Оптимальна робоча температура: 345°C - 365°C'
  }
];

// Спостереження контекстного навчання JARVIS
interface ContextObservation {
  id: string;
  text: string;
  type: 'success' | 'failure' | 'correction';
  timestamp: string;
}

// Порожньо за замовчуванням — JARVIS не вигадує чужого «досвіду».
// Записи зʼявляються лише коли користувач сам їх додасть або припаяє контакт.
const INITIAL_OBSERVATIONS: ContextObservation[] = [];

// Постійна пам'ять JARVIS — навчання зберігається між запусками програми.
const STORAGE_KEYS = {
  observations: 'jarvis_observations_v2', // v2: dropped fake demo seed observations
  knowledge: 'jarvis_knowledge_v1'
};

function loadPersisted<T>(key: string, fallback: T): T {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    }
  } catch (e) {
    console.warn('Не вдалося завантажити збережену пам\'ять JARVIS:', e);
  }
  return fallback;
}

function savePersisted(key: string, value: unknown) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    console.warn('Не вдалося зберегти пам\'ять JARVIS:', e);
  }
}

export default function App() {
  const [boardType, setBoardType] = useState<'esp32' | 'arduino' | 'rpipico'>('esp32');
  const [activeAlloy, setActiveAlloy] = useState<'sn63pb37' | 'sac305' | 'rose'>('sn63pb37');

  const ALLOY_INFO = {
    sn63pb37: {
      name: 'Sn63/Pb37 (ПОС-61)',
      type: 'Евтектичний свинцевий сплав',
      meltPoint: 183,
      recTemp: '315°C - 330°C',
      clean: 'Каніфольний флюс AMTECH NC-559-ASM',
      pathPoints: '20,180 60,130 100,105 140,40 160,45 220,180', // SVG polygon coordinates
      peak: '235°C',
      danger: 'Містить свинець. Завжди вмикайте димовловлювач!'
    },
    sac305: {
      name: 'SAC305 Lead-Free (Безсвинцевий)',
      type: 'Сучасний промисловий сплав',
      meltPoint: 217,
      recTemp: '345°C - 365°C',
      clean: 'Потребує нейтральних RMA або No-Clean флюсів',
      pathPoints: '20,180 50,110 80,95 130,22 150,28 220,180',
      peak: '260°C',
      danger: 'Висока температура, ризик відшарування мідних майданчиків!'
    },
    rose: {
      name: 'Низькотемпературний легкоплавкий Розе',
      type: 'Демонтажний сплав наднизької температури',
      meltPoint: 94,
      recTemp: '180°C - 215°C',
      clean: 'Ідеально для демонтажу чутливих SMD-мікросхем',
      pathPoints: '20,180 80,150 120,135 150,85 170,90 220,180',
      peak: '135°C',
      danger: 'Площадка крихка. Не використовуйте для механічного навантаження.'
    }
  };

  const [components, setComponents] = useState<CustomComponent[]>(INITIAL_COMPONENTS);
  const [connections, setConnections] = useState<SolderConnection[]>(INITIAL_CONNECTIONS);
  const [activeAnalysis, setActiveAnalysis] = useState<string>('');
  const [systemStatus, setSystemStatus] = useState<'idle' | 'thinking' | 'scanning' | 'success' | 'error'>('idle');
  
  // Дані в реальному часі
  const [coreTemp, setCoreTemp] = useState<number>(34.2);
  const [uptimeSecs, setUptimeSecs] = useState<number>(259800);
  
  // Довідковий пошук
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<CustomComponent | null>(null);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  
  // Канал Контекстного Навчання — завантажується з постійної пам'яті (localStorage)
  const [contextObservations, setContextObservations] = useState<ContextObservation[]>(
    () => loadPersisted(STORAGE_KEYS.observations, INITIAL_OBSERVATIONS)
  );

  const [newObsText, setNewObsText] = useState('');
  const [newObsType, setNewObsType] = useState<'success' | 'failure' | 'correction'>('success');
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseEntry[]>(
    () => loadPersisted(STORAGE_KEYS.knowledge, INITIAL_KNOWLEDGE_BASE)
  );
  const [kbTab, setKbTab] = useState<'component' | 'tool' | 'material'>('component');
  const [kbSearch, setKbSearch] = useState('');
  const [kbSearchQuery, setKbSearchQuery] = useState('');
  const [kbUpdatingLog, setKbUpdatingLog] = useState(false);
  const [kbSuccessAlert, setKbSuccessAlert] = useState(false);

  // Векторна пам'ять JARVIS (автономне навчання з інтернету)
  interface MemoryStats {
    count: number;
    recent: Array<{ id: string; topic: string; createdAt: string; sources: string[]; hits: number; preview: string }>;
  }
  const [memoryStats, setMemoryStats] = useState<MemoryStats>({ count: 0, recent: [] });
  const [learnTopic, setLearnTopic] = useState('');
  const [isLearning, setIsLearning] = useState(false);
  const [lastLearnedFlash, setLastLearnedFlash] = useState(false);

  // Голографічна 3D-модель (зʼявляється у вільній області на запит «покажи ...»)
  const [hologramSpec, setHologramSpec] = useState<HologramSpec | null>(null);
  const [isVisualizing, setIsVisualizing] = useState(false);

  // Каталог навичок JARVIS (розширювані здібності)
  const [skillsList, setSkillsList] = useState<Array<{ name: string; label: string; icon: string; hint: string }>>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'jarvis',
      text: 'Вітаю, Сер. Усі системи активні, нейронні мережі повністю синхронізовано. Я готовий проаналізувати ваші плати, ідентифікувати деталі через камеру, проконсультувати щодо вибору сплаву та флюсу, а також скласти оптимальні маршрути для пайки. Над чим працюватимемо сьогодні?',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [activeGrounding, setActiveGrounding] = useState<Array<{ title: string; url: string }>>([]);
  const [logs, setLogs] = useState<SystemHistoryLog[]>([
    {
      id: 'log-1',
      timestamp: '15:30:12',
      title: 'З\'єднання Встановлено',
      type: 'system',
      description: 'Термінал JARVIS успішно синхронізовано з хмарним нейро-ядром штучного зору.'
    }
  ]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Голосові параметри та функції JARVIS
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [voicesList, setVoicesList] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [voicePitch, setVoicePitch] = useState<number>(0.85); // JARVIS: calm British baritone
  const [voiceRate, setVoiceRate] = useState<number>(0.90);   // JARVIS: measured, deliberate pace
  const [voiceVolume, setVoiceVolume] = useState<number>(1.0);

  // Класифіковані ШІ-Профілі з індивідуальними характеристиками
  interface AIPersonalityPreset {
    id: string;
    name: string;
    pitch: number;
    rate: number;
    coreFreq: number;
    humType: 'sine' | 'square' | 'sawtooth' | 'triangle';
    description: string;
    welcomeMessage: string;
  }

  // Єдиний профіль — JARVIS у стилі «Залізної людини», українською.
  const AI_PRESETS: AIPersonalityPreset[] = [
    {
      id: 'jarvis',
      name: 'JARVIS Classic (Залізна людина)',
      pitch: 0.85,
      rate: 0.92,
      coreFreq: 55,
      humType: 'sine',
      description: 'Глибокий, спокійний та виважений чоловічий тон у стилі J.A.R.V.I.S. із фільму. Розмовляє українською.',
      welcomeMessage: 'Усі системи повністю функціональні, Сер. Нейронні шляхи синхронізовано, я у режимі очікування. Чим можу бути корисний?'
    }
  ];

  const [activeAIModel] = useState<string>('jarvis');

  // Канал фонового реакторного гулу під час мовлення JARVIS
  const reactorHumRef = useRef<{ ctx: AudioContext; osc1: OscillatorNode; osc2: OscillatorNode; lfo: OscillatorNode; gain: GainNode } | null>(null);

  // Запис мікрофона для розпізнавання мови через Gemini (Web Speech API не працює в Electron)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);

  // Живий режим: постійне слухання + VAD + переривання (без кнопки)
  const [liveMode, setLiveMode] = useState<boolean>(false);
  const isSpeakingRef = useRef(false);
  const processingRef = useRef(false);

  // Нейроголос (Piper/XTTS на сервері). Якщо недоступний — системний голос.
  const [neuralVoice, setNeuralVoice] = useState<boolean>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Отримання та оновлення голосів у браузері
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        
        // JARVIS priority for a Ukrainian-speaking assistant:
        // Ukrainian male > Ukrainian (any) > Russian/Slavic male (good Cyrillic) > male > rest
        const isMaleName = (n: string) =>
          n.includes('male') || n.includes('pavlo') || n.includes('ostap') || n.includes('yuriy') ||
          n.includes('danko') || n.includes('dmitry') || n.includes('dmytro') || n.includes('maksym') ||
          n.includes('maxim') || n.includes('andriy') || n.includes('павло') || n.includes('остап') ||
          n.includes('дмитро') || n.includes('максим') || n.includes('андрій') || n.includes('юрій');

        const scoreVoice = (v: SpeechSynthesisVoice) => {
          const n = v.name.toLowerCase();
          const l = v.lang.toLowerCase();
          const isUk = l.startsWith('uk');
          const isRu = l.startsWith('ru'); // Cyrillic-capable fallback, reads Ukrainian acceptably
          const male = isMaleName(n);
          if (isUk && male) return 100;
          if (isUk) return 90;
          if (isRu && male) return 60;
          if (isRu) return 50;
          if (male) return 30;
          return 10;
        };

        const sortedVoices = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
        setVoicesList(sortedVoices);

        // Auto-select the best Ukrainian (preferably male) voice for JARVIS
        if (sortedVoices.length > 0) {
          const ukMale = sortedVoices.find(v => v.lang.toLowerCase().startsWith('uk') && isMaleName(v.name.toLowerCase()));
          const anyUk = sortedVoices.find(v => v.lang.toLowerCase().startsWith('uk'));
          const ruMale = sortedVoices.find(v => v.lang.toLowerCase().startsWith('ru') && isMaleName(v.name.toLowerCase()));
          const fallback = ukMale || anyUk || ruMale || sortedVoices[0];
          setSelectedVoiceName(prev => {
            if (prev && sortedVoices.some(v => v.name === prev)) return prev;
            return fallback.name;
          });
        }
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      // Зупинка гулу при демонтажі
      if (reactorHumRef.current) {
        try {
          const { osc1, osc2, lfo, ctx } = reactorHumRef.current;
          osc1.stop();
          osc2.stop();
          lfo.stop();
          ctx.close();
        } catch (e) {}
      }
    };
  }, []);

  const playIntercomSquelch = (action: 'open' | 'close') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const bufferSize = ctx.sampleRate * 0.08;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = action === 'open' ? 2200 : 1600;
      noiseFilter.Q.value = 3.5;
      
      const noiseGain = ctx.createGain();
      const chirpOsc = ctx.createOscillator();
      const chirpGain = ctx.createGain();
      chirpOsc.type = 'sine';
      
      if (action === 'open') {
        chirpOsc.frequency.setValueAtTime(680, ctx.currentTime);
        chirpOsc.frequency.exponentialRampToValueAtTime(1380, ctx.currentTime + 0.045);
        chirpGain.gain.setValueAtTime(0.04, ctx.currentTime);
        chirpGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        
        noiseGain.gain.setValueAtTime(0.025, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.075);
      } else {
        chirpOsc.frequency.setValueAtTime(1200, ctx.currentTime);
        chirpOsc.frequency.setValueAtTime(320, ctx.currentTime + 0.035);
        chirpGain.gain.setValueAtTime(0.03, ctx.currentTime);
        chirpGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        
        noiseGain.gain.setValueAtTime(0.032, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      }
      
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      
      chirpOsc.connect(chirpGain);
      chirpGain.connect(ctx.destination);
      
      noiseSource.start();
      chirpOsc.start();
      
      noiseSource.stop(ctx.currentTime + 0.095);
      chirpOsc.stop(ctx.currentTime + 0.095);
      
      setTimeout(() => {
        try { ctx.close(); } catch(e){}
      }, 250);
    } catch (e) {
      console.warn("Intercom squelch sound failed to play", e);
    }
  };

  const startReactorHum = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const currentPreset = AI_PRESETS.find(p => p.id === activeAIModel) || AI_PRESETS[0];
      const baseFreq = currentPreset.coreFreq;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gainNode = ctx.createGain();
      const filterNode = ctx.createBiquadFilter();
      
      osc1.type = currentPreset.humType;
      osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime); 
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 2, ctx.currentTime); 
      
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(3.5, ctx.currentTime); 
      lfoGain.gain.setValueAtTime(baseFreq * 0.12, ctx.currentTime);
      
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(baseFreq * 1.8, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 0.15); 
      
      lfo.connect(lfoGain);
      lfoGain.connect(filterNode.frequency);
      
      osc1.connect(filterNode);
      osc2.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      lfo.start();
      
      reactorHumRef.current = { ctx, osc1, osc2, lfo, gain: gainNode };
    } catch (e) {
      console.warn("Reactor hum failed to start", e);
    }
  };

  const stopReactorHum = () => {
    if (reactorHumRef.current) {
      try {
        const { ctx, osc1, osc2, lfo, gain } = reactorHumRef.current;
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        setTimeout(() => {
          try {
            osc1.stop();
            osc2.stop();
            lfo.stop();
            ctx.close();
          } catch (err) {}
        }, 180);
      } catch (e) {
        console.warn("Reactor hum failed to stop", e);
      }
      reactorHumRef.current = null;
    }
  };

  const playJarvisSound = (type: 'beep' | 'listening' | 'done') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === 'beep') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
        
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.16);
        
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.28);
        osc2.stop(ctx.currentTime + 0.28);
      } else if (type === 'listening') {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
        gainNode.gain.setValueAtTime(0.06, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.14);
      } else if (type === 'done') {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.08);
        gainNode.gain.setValueAtTime(0.06, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      }
      setTimeout(() => {
        try { ctx.close(); } catch (err){}
      }, 300);
    } catch (e) {
      console.warn("AudioContext init skipped or failed", e);
    }
  };

  // Зупиняє будь-яке поточне мовлення (системне + нейро) і фоновий гул
  const stopSpeaking = () => {
    try { window.speechSynthesis.cancel(); } catch (e) {}
    if (currentAudioRef.current) {
      try { currentAudioRef.current.pause(); } catch (e) {}
      currentAudioRef.current = null;
    }
    stopReactorHum();
  };

  // Системний голос браузера (фолбек, коли немає нейроголосу)
  const speakSystem = (cleanText: string) => {
    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      let activeVoice = voices.find(v => v.name === selectedVoiceName);
      if (!activeVoice) {
        const isMale = (n: string) =>
          n.includes('male') || n.includes('pavlo') || n.includes('ostap') || n.includes('dmytro') ||
          n.includes('maksym') || n.includes('дмитро') || n.includes('максим') || n.includes('павло') || n.includes('остап');
        const ukMale = voices.find(v => v.lang.toLowerCase().startsWith('uk') && isMale(v.name.toLowerCase()));
        const anyUk = voices.find(v => v.lang.toLowerCase().startsWith('uk'));
        const ruMale = voices.find(v => v.lang.toLowerCase().startsWith('ru') && isMale(v.name.toLowerCase()));
        activeVoice = ukMale || anyUk || ruMale || voices.find(v => v.lang.toLowerCase().startsWith('ru')) || voices[0];
      }
      if (activeVoice) utterance.voice = activeVoice;
      utterance.lang = activeVoice?.lang?.toLowerCase().startsWith('uk') ? activeVoice.lang : 'uk-UA';
      utterance.pitch = voicePitch;
      utterance.rate = voiceRate;
      utterance.volume = voiceVolume;
      utterance.onstart = () => { setIsSpeaking(true); startReactorHum(); playIntercomSquelch('open'); };
      utterance.onend = () => { setIsSpeaking(false); stopReactorHum(); playIntercomSquelch('close'); };
      utterance.onerror = () => { setIsSpeaking(false); stopReactorHum(); playIntercomSquelch('close'); };
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error", e);
      setIsSpeaking(false);
    }
  };

  // Нейроголос Piper/XTTS через бекенд (повертає аудіо)
  const speakNeural = async (cleanText: string) => {
    const res = await fetch('/api/jarvis/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText })
    });
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('audio')) throw new Error('neural_unavailable'); // сервер повернув JSON => немає рушія
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudioRef.current = audio;
    audio.volume = voiceVolume;
    audio.onplay = () => { setIsSpeaking(true); startReactorHum(); playIntercomSquelch('open'); };
    const cleanup = () => { setIsSpeaking(false); stopReactorHum(); URL.revokeObjectURL(url); if (currentAudioRef.current === audio) currentAudioRef.current = null; };
    audio.onended = () => { playIntercomSquelch('close'); cleanup(); };
    audio.onerror = () => cleanup();
    await audio.play();
  };

  const speakText = (text: string) => {
    if (!voiceEnabled) return;
    const cleanText = text
      .replace(/[*#_`~]/g, '')
      .replace(/https?:\/\/\S+/g, 'веб джерело')
      .replace(/GPIO/gi, 'джі пі ай о')
      .replace(/VCC/gi, 'живлення ві сі сі')
      .replace(/GND/gi, 'земля')
      .replace(/SDA/gi, 'лінія ес ді ей')
      .replace(/SCL/gi, 'такт ес сі ел')
      .replace(/I2C/gi, 'ай ту сі')
      .replace(/OLED/gi, 'олед екран')
      .replace(/SSD1306/gi, 'ес ес ді тринадцять нуль шість')
      .replace(/ESP32/gi, 'і ес пі тридцять два')
      .replace(/DHT22/gi, 'де аш те двадцять два')
      .replace(/BME280/gi, 'бе ем е двісті вісімдесят');

    stopSpeaking();

    if (neuralVoice) {
      // Нейроголос; якщо недоступний на льоту — відкат на системний
      speakNeural(cleanText).catch(() => speakSystem(cleanText));
    } else {
      speakSystem(cleanText);
    }
  };

  // Спільна функція відправки повідомлення до JARVIS (для ручного вводу та голосу)
  const sendChatMessage = async (query: string) => {
    if (!query.trim()) return;

    setSystemStatus('thinking');
    addLog("Запит відправлено", "system", `Відправлено запит до консолі: "${query}"`);

    const userMsg: ChatMessage = {
      id: `usr-msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => [...prev, userMsg]);

    // Якщо просять показати деталь — паралельно будуємо 3D-голограму у вільній області
    const triggeredViz = wantsVisualization(query);
    if (triggeredViz) {
      requestVisualization(query);
    }

    try {
      const response = await fetch('/api/jarvis/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: query,
          history: [...chatMessages, userMsg].slice(-10),
          contextObservations: contextObservations,
          activeBoard: boardType,
          activeAlloy: activeAlloy,
          activeAIModel: activeAIModel
        })
      });
      const data = await response.json();

      const jarvMsg: ChatMessage = {
        id: `jarv-msg-${Date.now()}`,
        sender: 'jarvis',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString(),
        groundingUrls: data.groundingUrls
      };

      setChatMessages(prev => [...prev, jarvMsg]);
      speakText(data.reply);
      if (data.groundingUrls && data.groundingUrls.length > 0) {
        setActiveGrounding(data.groundingUrls);
        addLog("Досліджено інтернет", "research", `Отримано референтні дані з ${data.groundingUrls.length} веб-джерел.`);
      }
      // JARVIS автономно поповнив свою памʼять під час відповіді
      if (data.learnedNow) {
        addLog("Самонавчання", "research", `JARVIS самостійно вивчив і запамʼятав нові знання. Всього у памʼяті: ${data.memoryCount}.`);
        flashLearned();
        refreshMemoryStats();
      }
      // JARVIS застосував навички (function-calling)
      if (data.usedSkills && data.usedSkills.length > 0) {
        const labels = data.usedSkills.map((n: string) => skillsList.find(s => s.name === n)?.label || n);
        addLog("Навичку застосовано", "system", `JARVIS використав: ${labels.join(', ')}.`);
      }
      // Дії від навичок (напр. показати 3D), без дублювання вже запущеної голограми
      (data.skillActions || []).forEach((act: { type: string; payload: any }) => {
        if (act.type === 'visualize' && !triggeredViz) {
          requestVisualization(act.payload?.query || query);
        }
      });
      setSystemStatus('success');
    } catch (error) {
      console.error(error);
      setSystemStatus('error');
      addLog("Помилка чату", "system", "Нейронний шлюз повідомив про збій підключення.");
    }
  };

  // Завантаження статистики памʼяті JARVIS із бекенду
  const refreshMemoryStats = async () => {
    try {
      const res = await fetch('/api/jarvis/memory/stats');
      const data = await res.json();
      if (data && typeof data.count === 'number') setMemoryStats(data);
    } catch (err) {
      console.warn('Не вдалося отримати статистику памʼяті JARVIS', err);
    }
  };

  const flashLearned = () => {
    setLastLearnedFlash(true);
    setTimeout(() => setLastLearnedFlash(false), 4000);
  };

  // Запит на 3D-голограму компонента — показує модель у вільній області
  const requestVisualization = async (query: string) => {
    setIsVisualizing(true);
    addLog("Голографічна проєкція", "scan", `Будую 3D-модель за запитом: "${query}"...`);
    try {
      const res = await fetch('/api/jarvis/visualize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      if (data.spec) {
        setHologramSpec(data.spec);
        addLog("Голограму спроєктовано", "scan", `Модель «${data.spec.label}» активна. Обертайте мишею.`);
      }
    } catch (err) {
      console.warn('Не вдалося побудувати голограму', err);
      addLog("Помилка проєкції", "scan", "Не вдалося побудувати 3D-модель.");
    } finally {
      setIsVisualizing(false);
    }
  };

  // Чи схожий запит на прохання показати/візуалізувати деталь у 3D.
  // Без \b — він у JS не працює з кирилицею (укр. літери не входять у \w).
  const wantsVisualization = (text: string) =>
    /(покажи|показати|візуаліз|намалюй|зобрази|продемонструй|3\s?d|три\s?ді|голограм|hologram|render)/i.test(text);

  // Очищення векторної памʼяті JARVIS
  const handleClearMemory = async () => {
    if (!window.confirm("Стерти всю вивчену памʼять JARVIS? Цю дію не можна скасувати.")) return;
    try {
      const res = await fetch('/api/jarvis/memory/clear', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        addLog("Памʼять очищено", "system", `Видалено ${data.removed} записів знань. JARVIS почне навчатися заново.`);
        await refreshMemoryStats();
      }
    } catch (err) {
      console.warn('Не вдалося очистити памʼять', err);
    }
  };

  // Явне доручення JARVIS вивчити тему з інтернету
  const handleLearnTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!learnTopic.trim() || isLearning) return;

    setIsLearning(true);
    setSystemStatus('thinking');
    addLog("Автономне навчання", "research", `JARVIS досліджує в інтернеті: "${learnTopic}"...`);

    try {
      const res = await fetch('/api/jarvis/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: learnTopic.trim() })
      });
      const data = await res.json();

      if (data.ok) {
        const summary: string = data.summary || '';
        addLog("Знання засвоєно", "research", `JARVIS вивчив "${data.topic}" і зберіг у памʼять (${data.memoryCount} записів).`);
        flashLearned();
        await refreshMemoryStats();

        // Покажемо здобуті знання у діалозі та озвучимо короткий підсумок
        const learnMsg: ChatMessage = {
          id: `jarv-learn-${Date.now()}`,
          sender: 'jarvis',
          text: `📚 Я вивчив нову тему «${data.topic}» з інтернету та зберіг її у постійну памʼять, Сер.\n\n${summary}`,
          timestamp: new Date().toLocaleTimeString(),
          groundingUrls: data.sources
        };
        setChatMessages(prev => [...prev, learnMsg]);
        speakText(`Я вивчив тему ${data.topic} і зберіг її у памʼять, Сер.`);
        setSystemStatus('success');
        setLearnTopic('');
      } else {
        setSystemStatus('error');
        const reason = data.error === 'learn_unavailable'
          ? "Для автономного навчання потрібен ключ GEMINI_API_KEY."
          : (data.detail || "Не вдалося вивчити тему.");
        addLog("Навчання недоступне", "research", reason);
        speakText(reason);
      }
    } catch (err) {
      console.error(err);
      setSystemStatus('error');
      addLog("Помилка навчання", "research", "Збій каналу автономного дослідження.");
    } finally {
      setIsLearning(false);
    }
  };

  // Транскрипція записаного аудіо через бекенд (Gemini). Web Speech API не
  // працює в Electron, тому ми записуємо мікрофон і відправляємо аудіо на сервер.
  const transcribeAndSend = async (audioBlob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setSystemStatus('thinking');
    addLog("Транскрипція мови", "system", "Розпізнаю записане мовлення через нейронне ядро...");

    try {
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const response = await fetch('/api/jarvis/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64Audio, mimeType })
      });
      const data = await response.json();

      if (data.transcript && data.transcript.trim()) {
        const transcript = data.transcript.trim();
        addLog("Розпізнано голос", "system", `Транскрибовано: "${transcript}". Відправляю запит...`);
        playJarvisSound('done');
        await sendChatMessage(transcript);
      } else {
        setSystemStatus('error');
        const reason = data.error
          ? "Для розпізнавання голосу потрібен ключ GEMINI_API_KEY. Покладіть файл .env поруч із програмою."
          : "Не вдалося розпізнати мовлення. Спробуйте говорити чіткіше, ближче до мікрофона.";
        addLog("Помилка розпізнавання", "system", reason);
        speakText(reason);
      }
    } catch (err) {
      console.error("Transcription failed", err);
      setSystemStatus('error');
      addLog("Помилка розпізнавання", "system", "Збій каналу транскрипції мовлення.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const stopVoiceListening = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop(); // onstop виконає транскрипцію
      }
    } catch (err) {
      console.error("Failed to stop recorder", err);
    }
    setIsListening(false);
  };

  const startVoiceListening = async () => {
    // Натискання під час запису = зупинити та відправити
    if (isListening) {
      playJarvisSound('done');
      stopVoiceListening();
      return;
    }

    if (isTranscribing) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      addLog("Голосові модулі", "system", "Середовище не підтримує доступ до мікрофона.");
      alert("Доступ до мікрофона недоступний у цьому середовищі.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Обираємо підтримуваний формат контейнера
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'];
      const mimeType = candidates.find(t => MediaRecorder.isTypeSupported(t)) || '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // Звільняємо мікрофон
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
          mediaStreamRef.current = null;
        }
        const finalType = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: finalType });
        if (blob.size > 0) {
          transcribeAndSend(blob, finalType);
        } else {
          setIsListening(false);
        }
      };

      playJarvisSound('listening');
      recorder.start();
      setIsListening(true);
      addLog("Голосовий шлюз", "system", "Слухаю... Говоріть українською. Натисніть мікрофон ще раз, щоб завершити.");
    } catch (err: any) {
      console.error("Microphone access failed", err);
      setIsListening(false);
      addLog("Голосова помилка", "system", `Не вдалося отримати доступ до мікрофона: ${err?.name || err}`);
      alert("Не вдалося отримати доступ до мікрофона. Перевірте дозволи системи.");
    }
  };

  // Симуляція коливання температури ядра процесора
  useEffect(() => {
    const tempInterval = setInterval(() => {
      setCoreTemp(prev => +(prev + (Math.random() * 0.4 - 0.2)).toFixed(1));
    }, 4000);

    const uptimeInterval = setInterval(() => {
      setUptimeSecs(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(tempInterval);
      clearInterval(uptimeInterval);
    };
  }, []);

  // Автоскрол
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Постійне збереження навчання JARVIS — досвід і база знань переживають перезапуск
  useEffect(() => {
    savePersisted(STORAGE_KEYS.observations, contextObservations);
  }, [contextObservations]);

  useEffect(() => {
    savePersisted(STORAGE_KEYS.knowledge, knowledgeBase);
  }, [knowledgeBase]);

  // Завантаження стану векторної памʼяті та каталогу навичок при старті
  useEffect(() => {
    refreshMemoryStats();
    fetch('/api/jarvis/skills')
      .then(r => r.json())
      .then(d => { if (d.skills) setSkillsList(d.skills); })
      .catch(() => {});
    fetch('/api/jarvis/tts-info')
      .then(r => r.json())
      .then(d => { if (d.neural) { setNeuralVoice(true); addLog("Нейроголос", "system", `Активовано нейроголос (${d.engine}).`); } })
      .catch(() => {});
  }, []);

  // Синхронізація станів для циклу живої розмови
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { processingRef.current = isTranscribing || systemStatus === 'thinking'; }, [isTranscribing, systemStatus]);

  // Переривання JARVIS, коли користувач починає говорити
  const handleBargeIn = () => {
    stopSpeaking();
    setIsSpeaking(false);
    addLog("Перебито", "system", "Ви перервали JARVIS — слухаю вас.");
  };

  // Живий режим: безперервне слухання, VAD, переривання (безкоштовно, локально)
  useLiveConversation({
    enabled: liveMode,
    getState: () => ({ speaking: isSpeakingRef.current, processing: processingRef.current }),
    onUtterance: (blob, mime) => { transcribeAndSend(blob, mime); },
    onBargeIn: handleBargeIn,
    onListeningChange: (l) => setIsListening(l),
    onError: () => {
      setLiveMode(false);
      addLog("Живий режим", "system", "Не вдалося отримати доступ до мікрофона. Режим вимкнено.");
      alert("Не вдалося отримати доступ до мікрофона для живого режиму.");
    },
  });

  const addLog = (title: string, type: 'research' | 'soldering' | 'scan' | 'system', description: string) => {
    const newLog: SystemHistoryLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      title,
      type,
      description
    };
    setLogs(prev => [newLog, ...prev.slice(0, 15)]);
  };

  const formatUptime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Пошук деталей  
  const executeComponentSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setLookupLoading(true);
    setSystemStatus('thinking');
    addLog(`Запит пошуку: ${searchQuery}`, 'research', `Сканування баз даних IEEE та технічних архівів на наявність ${searchQuery}...`);
    
    try {
      const response = await fetch('/api/jarvis/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ componentName: searchQuery })
      });
      const data = await response.json();
      
      if (data && data.name) {
        setSearchResults(data);
        
        if (!components.some(c => c.name.toLowerCase() === data.name.toLowerCase())) {
          setComponents(prev => [...prev, data]);
          
          const defaultConn: SolderConnection = {
            id: `conn-gen-${Date.now()}`,
            fromPin: data.category === 'sensor' ? 'GPIO32' : 'GP0 (I2C SDA)',
            toComponentId: data.id,
            toComponentPin: Object.keys(data.pinoutDesc)[0] || 'VCC',
            color: '#10b981',
            purpose: `Підключення виводу автоматично знайденої та розпізнаної деталі ${data.name}`,
            status: 'pending'
          };
          setConnections(prev => [...prev, defaultConn]);
          addLog("Згенеровано з'єднання", "soldering", `Додано нову лінію зв'язку на контактну площадку плати.`);
        }
        
        setSystemStatus('success');
        addLog(`Компонент визначено`, 'research', `Успішно завантажено та розплановано параметри для ${data.name}`);
      } else {
        setSystemStatus('error');
      }
    } catch (err) {
      console.error(err);
      setSystemStatus('error');
    } finally {
      setLookupLoading(false);
    }
  };

  // Метод ручного додавання контекстного спостереження
  const handleAddCustomObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObsText.trim()) return;

    const newObs = {
      id: `obs-manual-${Date.now()}`,
      text: newObsText,
      type: newObsType,
      timestamp: new Date().toLocaleTimeString()
    };

    setContextObservations(prev => [newObs, ...prev]);
    addLog(
      newObsType === 'success' ? "Успішний досвід" : newObsType === 'failure' ? "Запис помилки" : "Пам'ятка корекції",
      'system',
      `Внесено нове спостереження у нейронний шлюз: "${newObsText.substring(0, 30)}..."`
    );
    setNewObsText('');
  };

  // AI Автономне Оновлення Бази Знань з Інтернету (Grounding downloader)
  const handleInternetKbUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbSearchQuery.trim()) return;

    setKbUpdatingLog(true);
    setSystemStatus('thinking');
    addLog(`AI Авто-Дослідження`, 'research', `Запущено автономний веб-пошук для збагачення бази знань щодо: "${kbSearchQuery}"...`);

    try {
      const response = await fetch('/api/jarvis/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ componentName: kbSearchQuery })
      });
      const data = await response.json();

      if (data && data.name) {
        if (!components.some(c => c.name.toLowerCase() === data.name.toLowerCase())) {
          setComponents(prev => [...prev, data]);
        }

        const safeTempStr = data.category === 'sensor' ? '310°C - 330°C' : data.category === 'ic' ? '320°C - 340°C' : '330°C - 350°C';
        const newKbEntry: KnowledgeBaseEntry = {
          id: `kb-gen-${Date.now()}`,
          name: data.name,
          category: (data.category === 'sensor' || data.category === 'ic' ? 'component' : 'tool'),
          description: data.notes || `Електронний вузол ${data.name}, автономно досліджений у мережі Інтернет через нейро-шлюз.`,
          bestPractices: data.datasheetSnippet || `Застосовуйте мінімальну температуру паяльника та якісний флюс на контактних виводах.`,
          safeTemp: safeTempStr,
          sources: ['Веб-даташит SparkFun / Adafruit Grounding Network']
        };

        setKnowledgeBase(prev => [newKbEntry, ...prev]);
        setKbSuccessAlert(true);
        setSystemStatus('success');
        addLog(`Базу знань оновлено`, 'research', `Параметри деталі "${data.name}" верифіковані в мережі та занесені до реєстру.`);
        setTimeout(() => setKbSuccessAlert(false), 4000);
        setKbSearchQuery('');
      } else {
        // Fallback через chat у разі відсутності схеми в жорсткі базі
        const responseFall = await fetch('/api/jarvis/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Надай коротку технічну довідку для "${kbSearchQuery}". Розкажи про його категорію, безпечну температуру пайки або роботи, та головну пораду. Важливо відповісти 2-3 реченнями виключно українською мовою.`,
            history: []
          })
        });
        const fallData = await responseFall.json();

        const newKbEntry: KnowledgeBaseEntry = {
          id: `kb-fall-${Date.now()}`,
          name: kbSearchQuery,
          category: 'component',
          description: fallData.reply || `Параметри приладу ${kbSearchQuery} успішно збагачені за допомогою штучного інтелекту.`,
          bestPractices: `Припаюйте контакти відповідно до стандартів IPC/JEDEC. Перевіряйте адреси на шині.`,
          safeTemp: '320°C - 335°C',
          sources: fallData.groundingUrls?.map((lnk: any) => lnk.title) || ['Мережевий аналізатор JARVIS Search']
        };

        setKnowledgeBase(prev => [newKbEntry, ...prev]);
        setKbSuccessAlert(true);
        setSystemStatus('success');
        addLog(`Базу знань розширено`, 'research', `Базу знань розширено описом для "${kbSearchQuery}" за допомогою нейронного пошуку.`);
        setTimeout(() => setKbSuccessAlert(false), 4000);
        setKbSearchQuery('');
      }
    } catch (err) {
      console.error(err);
      setSystemStatus('error');
      addLog("Помилка авто-оновлення", "research", "Нейронний шлюз повідомив про збій веб-пошуку.");
    } finally {
      setKbUpdatingLog(false);
    }
  };

  // Аналіз кадру камери з урахуванням спостережень
  const handleCameraCapture = async (base64Image: string, optionalQuery?: string) => {
    setSystemStatus('scanning');
    addLog("Нейронний аналіз кадру", "scan", "Сканування зображення камери на наявність мікросхем, провідників та контактів пайки...");
    
    const captureMsg: ChatMessage = {
      id: `usr-cap-${Date.now()}`,
      sender: 'user',
      text: optionalQuery || "Сер, проаналізуйте цей кадр деталей і налаштуйте оптимальні кроки для збірки на основі нашого досвіду.",
      timestamp: new Date().toLocaleTimeString(),
      image: base64Image
    };
    setChatMessages(prev => [...prev, captureMsg]);

    try {
      setSystemStatus('thinking');
      const response = await fetch('/api/jarvis/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: base64Image,
          query: optionalQuery || "Визначте компоненти, розпишіть замінники, піни та підкажіть куди і як паяти.",
          activeBoard: boardType,
          contextObservations: contextObservations // Передаємо контекстні спостереження
        })
      });
      const data = await response.json();
      
      const jarvisReply: ChatMessage = {
        id: `jarv-cap-${Date.now()}`,
        sender: 'jarvis',
        text: data.analysis || "Аналіз завершено успішно, Сер. Виявлено мідні доріжки та контактні контури.",
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, jarvisReply]);
      setActiveAnalysis(data.analysis || "Аналіз камери завантажено.");
      setSystemStatus('success');
      addLog("Звіт аналізу готовий", "scan", "Розпізнано нові вузли. Схему паяльних з'єднань скориговано.");
      speakText(data.analysis || "Аналіз завершено успішно, Сер. Виявлено мідні доріжки та контактні контури.");
      // Зір теж навчає JARVIS — оновлюємо памʼять
      if (data.memoryCount) {
        flashLearned();
        refreshMemoryStats();
      }
      // Камера сама додає розпізнані деталі у схему пайки
      if (Array.isArray(data.components) && data.components.length > 0) {
        addIdentifiedComponents(data.components);
      }
    } catch (err) {
      console.error(err);
      setSystemStatus('error');
      addLog("Помилка аналізу", "scan", "Не вдалося отримати відеодані від нейронного вузла.");
    }
  };

  // Нормалізація категорії під тип CustomComponent
  const normalizeCategory = (c: string): CustomComponent['category'] => {
    const s = (c || '').toLowerCase();
    if (s.includes('sensor') || s.includes('сенсор') || s.includes('датчик')) return 'sensor';
    if (s.includes('actuator') || s.includes('motor') || s.includes('реле') || s.includes('двигун')) return 'actuator';
    if (s.includes('ic') || s.includes('chip') || s.includes('мікросхем') || s.includes('module') || s.includes('модул') || s.includes('mcu') || s.includes('плат')) return 'ic';
    if (s.includes('passive') || s.includes('резистор') || s.includes('конденсатор') || s.includes('діод') || s.includes('resistor') || s.includes('capacitor') || s.includes('diode')) return 'passive';
    return 'other';
  };

  // Додає розпізнані камерою деталі у схему (компоненти + стартові з'єднання)
  const addIdentifiedComponents = (list: any[]) => {
    const wireColors = ['#ef4444', '#38bdf8', '#a855f7', '#10b981', '#f59e0b', '#ec4899'];
    let added = 0;
    list.forEach((c) => {
      const name = (c?.name || '').trim();
      if (!name) return;
      if (components.some((ex) => ex.name.toLowerCase() === name.toLowerCase())) return; // дедуплікація

      const pins: string[] = Array.isArray(c.pins) && c.pins.length ? c.pins : ['VCC', 'GND'];
      const pinoutDesc: Record<string, string> = {};
      pins.forEach((p: string) => { pinoutDesc[p] = ''; });
      const id = `cam-${name.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-')}-${Date.now().toString().slice(-4)}`;

      const newComp: CustomComponent = {
        id,
        name,
        category: normalizeCategory(c.category),
        pinoutCount: c.pinoutCount || pins.length,
        pinoutDesc,
        alternatives: [],
        notes: 'Розпізнано камерою JARVIS.'
      };
      setComponents((prev) => [...prev, newComp]);

      const newConn: SolderConnection = {
        id: `conn-cam-${Date.now()}-${added}`,
        fromPin: c.suggestedFromPin || (boardType === 'esp32' ? 'GPIO21 (SDA)' : boardType === 'rpipico' ? 'GP0 (I2C SDA)' : 'A4'),
        toComponentId: id,
        toComponentPin: pins[0] || 'VCC',
        color: wireColors[added % wireColors.length],
        purpose: `Підключення розпізнаної деталі ${name}`,
        status: 'pending'
      };
      setConnections((prev) => [...prev, newConn]);
      added++;
    });

    if (added > 0) {
      addLog("Деталі додано у схему", "scan", `JARVIS розпізнав і додав ${added} деталь(ей) у схему пайки.`);
    }
  };

  // Чат з урахуванням спостережень
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const query = chatInput;
    setChatInput('');
    await sendChatMessage(query);
  };

  // Зміна статусу пайки у PinoutVisualizer
  const toggleSolderConnectionStatus = (connId: string) => {
    setConnections(prev => prev.map(c => {
      if (c.id === connId) {
        const nextStatus = c.status === 'completed' ? 'pending' : 'completed';
        
        // Автоматичний спостережливий запис у контекстне навчання (оскільки користувач виконав дію на верстаті)
        const textObs = nextStatus === 'completed' 
          ? `Успіх: Користувач припаяв пін ${c.fromPin} до порту ${c.toComponentPin} компонента ${c.toComponentId} при температурі паяльника 330°C.`
          : `Коригування: Розпаяно або роз'єднано контакт ${c.fromPin} з порту ${c.toComponentPin} компонента ${c.toComponentId}. З'єднання анульовано.`;
          
        const newObs = {
          id: `obs-auto-${Date.now()}`,
          text: textObs,
          type: (nextStatus === 'completed' ? 'success' : 'correction') as 'success' | 'correction',
          timestamp: new Date().toLocaleTimeString()
        };
        
        setContextObservations(prev => [newObs, ...prev]);
        addLog(
          nextStatus === 'completed' ? "Успішна пайка контакту" : "Розпайка контакту", 
          "soldering", 
          `Параметри з'єднання ${c.fromPin} оновлено на "${nextStatus === 'completed' ? 'Припаяно' : 'В очікуванні'}". Дані додано до контекстного навчання.`
        );
        return { ...c, status: nextStatus };
      }
      return c;
    }));
  };

  const activeProject: MakerProject = {
    id: 'diy-maker-pro',
    name: 'Матриця об\'єднаних IoT контролерів',
    description: 'Динамічна збірка електроніки під керуванням J.V.S.',
    boardType: boardType,
    createdAt: new Date().toDateString(),
    components: components,
    connections: connections
  };

  // Фільтрація довідника бази знань
  const filteredKb = knowledgeBase.filter(entry => {
    if (entry.category !== kbTab) return false;
    if (!kbSearch) return true;
    const s = kbSearch.toLowerCase();
    return entry.name.toLowerCase().includes(s) || 
           entry.description.toLowerCase().includes(s) || 
           entry.bestPractices.toLowerCase().includes(s);
  });

  return (
    <div className="w-full min-h-screen bg-slate-950 text-cyan-400 font-mono p-3 md:p-4 flex flex-col gap-4 overflow-x-hidden border-4 border-slate-900 selection:bg-cyan-900 selection:text-white">
      
      {/* ШАПКА ПАНЕЛІ */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-cyan-900/50 pb-3 gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white flex items-center gap-2">
            J.V.S. <span className="text-cyan-500 font-light text-base md:text-lg">v4.0.5-AUTONOMOUS</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-70">
            Joint Virtual Synthesis • Система автономного асистування, пайки та навчання
          </p>
        </div>
        
        {/* Телеметрія */}
        <div className="flex flex-wrap gap-4 text-[10px] uppercase font-mono tracking-wider w-full md:w-auto p-0">
          <div 
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              playJarvisSound('beep');
              if (!voiceEnabled) {
                // Speak confirmation immediately when turned on
                setTimeout(() => {
                  speakText("Мовний синтезатор активовано, Сер. Аудіоканал повністю встановлено.");
                }, 400);
              }
            }} 
            className="flex flex-col items-start bg-slate-900/60 p-1.5 px-3 rounded border border-cyan-950 hover:border-cyan-500 transition cursor-pointer min-w-[110px]"
            title="Перемикач голосових відповідей JARVIS"
          >
            <span className="opacity-50 text-[9px] flex items-center gap-1">
              {voiceEnabled ? <Volume2 className="w-3 h-3 text-cyan-400" /> : <VolumeX className="w-3 h-3 text-red-500 animate-pulse" />} 
              СИНТЕЗ ГОЛОСУ
            </span>
            <span className={`font-bold text-sm ${voiceEnabled ? 'text-cyan-400' : 'text-red-500'}`}>
              {voiceEnabled ? 'УВІМКНЕНО' : 'ВИМКНЕНО'}
            </span>
          </div>
          <div className="flex flex-col items-start bg-slate-900/60 p-1.5 px-3 rounded border border-cyan-950 min-w-[110px]">
            <span className="opacity-50 text-[9px] flex items-center gap-1"><Flame className="w-3 h-3 text-amber-500" /> Температура Ядра</span>
            <span className="text-white font-bold text-sm tracking-widest">{coreTemp}°C</span>
          </div>
          <div className="flex flex-col items-start bg-slate-900/60 p-1.5 px-3 rounded border border-cyan-950 min-w-[110px]">
            <span className="opacity-50 text-[9px] flex items-center gap-1"><Activity className="w-3 h-3 text-emerald-400" /> Мережева активність</span>
            <span className="text-emerald-400 font-bold text-sm">АКТИВНА</span>
          </div>
          <div className="flex flex-col items-start bg-slate-900/60 p-1.5 px-3 rounded border border-cyan-950 min-w-[110px]">
            <span className="opacity-50 text-[9px] flex items-center gap-1"><Clock className="w-3 h-3 text-cyan-400" /> UPTIME СИСТЕМИ</span>
            <span className="text-white font-bold text-sm tracking-widest">{formatUptime(uptimeSecs)}</span>
          </div>
        </div>
      </header>

      {/* СІТКА НА З ТРИ СТОВПЧИКИ (High Density) */}
      <div className="grid grid-cols-12 gap-4 flex-1">
        
        {/* ЛІВИЙ СТОВПЧИК: Нейро-ядро та блок кураторського контекстного навчання */}
        <aside className="col-span-12 lg:col-span-3 flex flex-col gap-4">
          
          {/* Нейро-Ядро JARVIS */}
          <div className="bg-slate-900/50 border border-cyan-900/30 rounded-lg p-3">
            <h2 className="text-xs font-bold mb-2 uppercase tracking-widest text-slate-200 flex items-center justify-between border-b border-cyan-950 pb-1.5">
              <span>Assembly Neural Center</span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_cyan] animate-ping" />
            </h2>
            <JarvisCore 
              status={systemStatus} 
              isSpeaking={isSpeaking}
              isListening={isListening}
              onCoreClick={() => {
                setSystemStatus('thinking');
                playJarvisSound('beep');
                speakText("Усі системи функціональні, Сер. Я повністю синхронізований із вашим верстатом і готовий допомогти.");
                setTimeout(() => setSystemStatus('idle'), 1500);
              }}
              message={systemStatus === 'thinking' ? 'Запит до хмарної нейромережі з інтернет-пошуком...' : 'Канал зв\'язку захищено. Натисніть на Ядро для самодіагностики.'}
            />
          </div>

          {/* КОНТЕКСТНЕ НАВЧАННЯ ТА КОРЕКЦІЯ (Contextual Learning State Engine) */}
          <div className="bg-slate-900/50 border border-cyan-900/30 rounded-lg p-3 flex flex-col gap-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-white border-b border-cyan-950 pb-1.5 flex justify-between items-center">
                <span>🧠 Контекстне Навчання AI</span>
                <span className="text-[9px] bg-emerald-950 px-1 text-emerald-400 font-normal rounded border border-emerald-900/60 uppercase">💾 Пам'ять</span>
              </h2>
              <p className="text-[10px] text-slate-400 mt-1 leading-normal italic text-left">
                JARVIS навчається на ваших успіхах, перегрівах та порадах. Досвід зберігається у постійній пам'яті ({contextObservations.length} записів) і передається кожному запиту — навіть після перезапуску програми.
              </p>
            </div>

            {/* Списки спостережень */}
            <div className="space-y-1.5 overflow-y-auto max-h-44 pr-1 text-left">
              {contextObservations.length === 0 ? (
                <p className="text-xs text-slate-600 italic py-2">Скринька досвіду порожня.</p>
              ) : (
                contextObservations.map((obs) => (
                  <div 
                    key={obs.id} 
                    className={`p-1.5 rounded border text-[10px] leading-tight flex flex-col gap-0.5 ${
                      obs.type === 'success' 
                        ? 'bg-emerald-950/20 border-emerald-900 text-emerald-400' 
                        : obs.type === 'failure'
                          ? 'bg-red-950/20 border-red-900 text-red-400'
                          : 'bg-amber-950/20 border-amber-900 text-amber-300'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[9px] uppercase font-bold opacity-80">
                      <span>{obs.type === 'success' ? '🟢 УСПІХ' : obs.type === 'failure' ? '🔴 НЕВДАЧА' : '🟡 ПАМ\'ЯТКА'}</span>
                      <span className="font-mono text-slate-500">{obs.timestamp}</span>
                    </div>
                    <p>{obs.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Форма швидкого внесення досвіду */}
            <form onSubmit={handleAddCustomObservation} className="pt-2 border-t border-cyan-950 flex flex-col gap-2">
              <label className="block text-[9px] text-slate-300 uppercase tracking-widest text-left">
                Зафіксувати зауваження/власний досвід:
              </label>
              <input
                type="text"
                value={newObsText}
                onChange={(e) => setNewObsText(e.target.value)}
                placeholder="наприклад: Паяти датчик DHT22 на 315 градусах, інакше горить..."
                className="bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-cyan-500 rounded p-1 px-2 text-[10px] text-slate-200 outline-none placeholder-slate-700"
              />
              <div className="flex gap-1 justify-between">
                <div className="flex gap-1 text-[9px]">
                  {(['success', 'failure', 'correction'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewObsType(t)}
                      className={`px-1.5 py-0.5 rounded border ${
                        newObsType === t
                          ? t === 'success' ? 'bg-emerald-950 border-emerald-500 text-emerald-400' : t === 'failure' ? 'bg-red-950 border-red-500 text-red-400' : 'bg-amber-950 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-850 text-slate-500'
                      }`}
                    >
                      {t === 'success' ? 'Успіх' : t === 'failure' ? 'Невдача' : 'Порада'}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  className="p-0.5 px-2 bg-cyan-950 border border-cyan-800 text-cyan-400 hover:text-white rounded text-[10px] font-bold"
                >
                  Внести Досвід
                </button>
              </div>
            </form>
          </div>

          {/* ВЕКТОРНА ПАМʼЯТЬ JARVIS — реальне автономне навчання з інтернету */}
          <div className={`bg-slate-900/50 border rounded-lg p-3 flex-1 flex flex-col justify-between transition-colors duration-500 ${lastLearnedFlash ? 'border-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.35)]' : 'border-cyan-900/30'}`}>
            <div>
              <h2 className="text-xs font-bold mb-2 flex justify-between items-center text-slate-200 border-b border-cyan-950 pb-1.5">
                <span className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-cyan-400" /> ПАМʼЯТЬ ЗНАНЬ JARVIS</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">{memoryStats.count} 🧠</span>
                  {memoryStats.count > 0 && (
                    <button
                      onClick={handleClearMemory}
                      className="text-[8px] text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-900 rounded px-1 py-0.5 uppercase transition"
                      title="Стерти всю вивчену памʼять"
                    >
                      Очистити
                    </button>
                  )}
                </span>
              </h2>

              <p className="text-[9px] text-slate-400 leading-normal italic text-left mb-2">
                JARVIS сам досліджує інтернет і запамʼятовує знання у векторну памʼять (RAG). Він згадує їх перед кожною відповіддю — і памʼятає навіть після перезапуску.
              </p>

              {/* Доручити JARVIS вивчити тему */}
              <form onSubmit={handleLearnTopic} className="flex gap-1.5 mb-2">
                <input
                  type="text"
                  value={learnTopic}
                  onChange={(e) => setLearnTopic(e.target.value)}
                  placeholder="Навчити темі: напр. 'BME280', 'пайка QFN'..."
                  className="flex-1 bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-cyan-500 rounded p-1 px-2 text-[10px] text-slate-200 outline-none placeholder-slate-700"
                />
                <button
                  type="submit"
                  disabled={isLearning}
                  className="p-1 px-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 disabled:opacity-50 text-emerald-400 rounded text-[10px] flex items-center gap-1"
                  title="JARVIS дослідить тему в інтернеті та запамʼятає"
                >
                  {isLearning ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
                </button>
              </form>

              {lastLearnedFlash && (
                <div className="mb-2 p-1 bg-emerald-950/80 border border-emerald-800 rounded text-[9px] text-emerald-400 text-center uppercase font-bold animate-pulse">
                  ✓ JARVIS засвоїв нові знання!
                </div>
              )}

              {/* Останнє вивчене */}
              <div className="space-y-1.5 text-left max-h-44 overflow-y-auto pr-1">
                {memoryStats.recent.length === 0 ? (
                  <p className="text-[10px] text-slate-600 italic py-2">
                    Памʼять поки порожня. Поставте запитання або доручіть тему — JARVIS почне вчитися.
                  </p>
                ) : (
                  memoryStats.recent.map((item) => (
                    <div key={item.id} className="p-1.5 rounded border border-cyan-950/60 bg-slate-950/50 text-[9.5px]">
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-cyan-300 font-bold truncate">📎 {item.topic}</span>
                        {item.hits > 0 && (
                          <span className="text-[8px] text-amber-400 shrink-0" title="Скільки разів JARVIS використав ці знання">↺{item.hits}</span>
                        )}
                      </div>
                      <p className="text-slate-400 mt-0.5 leading-tight line-clamp-2">{item.preview}…</p>
                      {item.sources && item.sources.length > 0 && (
                        <div className="text-[8px] text-teal-500/80 mt-0.5 truncate">🌐 {item.sources.length} джерел з інтернету</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-cyan-950">
              <p className="text-[9px] font-mono text-cyan-300/70 leading-relaxed text-left">
                <span className="text-white font-black">РОЗУМ:</span> Gemini (хмара) • <span className="text-white font-black">ПАМʼЯТЬ:</span> власна векторна база JARVIS • <span className="text-white font-black">НАВЧАННЯ:</span> автономне з вебу
              </p>
            </div>
          </div>

          {/* НАВИЧКИ JARVIS (розширювані здібності) */}
          {skillsList.length > 0 && (
            <div className="bg-slate-900/50 border border-cyan-900/30 rounded-lg p-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-white border-b border-cyan-950 pb-1.5 flex justify-between items-center mb-2">
                <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-cyan-400" /> Навички JARVIS</span>
                <span className="text-[9px] bg-cyan-950 px-1 text-cyan-400 rounded border border-cyan-900/60">{skillsList.length}</span>
              </h2>
              <p className="text-[9px] text-slate-400 italic mb-2 leading-normal">
                JARVIS сам обирає й застосовує навичку під запит. Нові здібності легко додати в код (<span className="font-mono text-cyan-500">skills.ts</span>).
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {skillsList.map((s) => (
                  <div key={s.name} className="p-1.5 rounded border border-cyan-950/60 bg-slate-950/50 text-[9.5px]" title={s.hint}>
                    <div className="text-cyan-300 font-bold flex items-center gap-1">{s.icon} {s.label}</div>
                    <div className="text-slate-500 text-[8px] mt-0.5 truncate">{s.hint}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* СЕРЕДНІЙ СТОВПЧИК: Камера, markdown аналізатор, покрокова збірка */}
        <section className="col-span-12 lg:col-span-6 flex flex-col gap-4">

          {/* ГОЛОГРАФІЧНА 3D-ПРОЄКЦІЯ (вільна область) — зʼявляється на запит «покажи ...» */}
          {isVisualizing && !hologramSpec && (
            <div className="p-6 bg-slate-950/80 border border-cyan-800/50 rounded-lg flex items-center justify-center gap-2 text-cyan-400 text-xs font-mono">
              <RefreshCw className="w-4 h-4 animate-spin" /> Будую голографічну 3D-проєкцію...
            </div>
          )}
          {hologramSpec && (
            <HologramViewer spec={hologramSpec} onClose={() => setHologramSpec(null)} />
          )}

          {/* Конфігуратор верстата */}
          <div className="p-3 bg-slate-900 border border-cyan-900/40 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200 uppercase">АКТИВНА ПЛАТА ВЕРСТАТА:</span>
            </div>
            <div className="flex gap-1">
              {(['esp32', 'arduino', 'rpipico'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setBoardType(b);
                    addLog("Зміна плати", "system", `Змінено модель активного контролера в кабінеті на: ${b.toUpperCase()}`);
                  }}
                  className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded border transition cursor-pointer ${
                    boardType === b
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-400 font-bold shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* МАТЕРІАЛИ ТА ТЕРМОДИНАМІКА ПАЙКИ — показуємо лише коли вже є що паяти */}
          {(components.length > 0 || connections.length > 0) && (
          <div className="p-3.5 bg-slate-900 border border-cyan-900/40 rounded-lg shadow-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[80px] h-[1px] bg-gradient-to-r from-transparent to-amber-500" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 mb-3 border-b border-cyan-950">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-100 uppercase tracking-widest">ТЕРМІЧНИЙ ПРОФІЛЬ СПЛАВУ</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {(['sn63pb37', 'sac305', 'rose'] as const).map((alloyKey) => (
                  <button
                    key={alloyKey}
                    onClick={() => {
                      setActiveAlloy(alloyKey);
                      playJarvisSound('beep');
                      addLog("Зміна припою", "system", `Змінено тепловий профіль монтажу на сплав: ${ALLOY_INFO[alloyKey].name}`);
                    }}
                    className={`text-[9px] font-mono px-2 py-0.5 rounded border transition cursor-pointer font-bold ${
                      activeAlloy === alloyKey
                        ? 'bg-amber-950/40 border-amber-500 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                        : 'bg-slate-950 border-cyan-950/60 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {alloyKey.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Термограма та графік */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
              {/* Термо-графік */}
              <div className="md:col-span-6 bg-slate-950/90 rounded border border-cyan-950/80 p-2 relative flex flex-col justify-center items-center h-[142px]">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 240 180" preserveAspectRatio="none">
                  <line x1="20" y1="180" x2="220" y2="180" stroke="#1e293b" strokeWidth="1" />
                  <line x1="20" y1="20" x2="20" y2="180" stroke="#1e293b" strokeWidth="1" />
                  
                  <line x1="20" y1="135" x2="220" y2="135" stroke="#1e293b" strokeWidth="1" strokeDasharray="2,3" />
                  <line x1="20" y1="90" x2="220" y2="90" stroke="#1e293b" strokeWidth="1" strokeDasharray="2,3" />
                  <line x1="20" y1="40" x2="220" y2="40" stroke="#1e293b" strokeWidth="1" strokeDasharray="2,3" />

                  <text x="25" y="130" fill="#475569" className="font-mono text-[7.5px]">100°C</text>
                  <text x="25" y="85" fill="#475569" className="font-mono text-[7.5px]">200°C</text>
                  <text x="25" y="35" fill="#475569" className="font-mono text-[7.5px]">{activeAlloy === 'rose' ? '150°C' : '300°C'}</text>

                  <defs>
                    <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <polygon 
                    points={ALLOY_INFO[activeAlloy].pathPoints} 
                    fill="url(#curveGradient)" 
                    stroke="#f59e0b" 
                    strokeWidth="1.8" 
                    className="transition-all duration-700 font-bold"
                  />

                  <text x="50" y="172" fill="#64748b" className="font-mono text-[7px]" textAnchor="middle">Прогрів</text>
                  <text x="105" y="172" fill="#64748b" className="font-mono text-[7px]" textAnchor="middle">Активація</text>
                  <text x="155" y="172" fill="#f59e0b" className="font-mono text-[7px]" textAnchor="middle">Рефлоу</text>
                  <text x="195" y="172" fill="#38bdf8" className="font-mono text-[7px]" textAnchor="middle">Охолодж_</text>

                  <circle cx="150" cy="42" r="3.5" fill="#f59e0b" className="animate-ping" />
                  <circle cx="150" cy="42" r="2" fill="#fff" />
                </svg>
                
                <div className="absolute top-1 right-2 font-mono text-[7.5px] text-amber-500 flex gap-2">
                  <span>MELT: {ALLOY_INFO[activeAlloy].meltPoint}°C</span>
                  <span>PEAK: {ALLOY_INFO[activeAlloy].peak}</span>
                </div>
              </div>

              {/* Характеристики матеріалу */}
              <div className="md:col-span-6 flex flex-col gap-1.5 text-left text-[10px] leading-relaxed select-none overflow-hidden">
                <div className="flex flex-col">
                  <span className="text-slate-500 uppercase text-[8px] font-mono tracking-wider">СПЛАВ ТА СТРУКТУРА:</span>
                  <span className="font-bold text-slate-200">{ALLOY_INFO[activeAlloy].name} ({ALLOY_INFO[activeAlloy].type})</span>
                </div>
                
                <div className="flex flex-col border-t border-cyan-950/40 pt-1.5">
                  <span className="text-slate-500 uppercase text-[8px] font-mono tracking-wider">КОНТРОЛЕР ПАЯЛЬНИКА (TARGET TEMP):</span>
                  <span className="font-mono font-bold text-amber-500 flex items-center gap-1">
                    ⚡ {ALLOY_INFO[activeAlloy].recTemp} 
                    <span className="text-[8px] text-slate-400 font-normal">(регулювання жала)</span>
                  </span>
                </div>

                <div className="flex flex-col border-t border-cyan-950/40 pt-1.5">
                  <span className="text-slate-500 uppercase text-[8px] font-mono tracking-wider">РЕКОМЕНДОВАНИЙ ФЛЮС:</span>
                  <span className="font-mono text-cyan-400 font-medium">{ALLOY_INFO[activeAlloy].clean}</span>
                </div>

                <div className="flex flex-col border-t border-cyan-950/40 pt-1.5 bg-amber-500/5 p-1 px-1.5 rounded border border-amber-500/10">
                  <span className="text-amber-500/80 uppercase text-[7.5px] font-mono font-black tracking-wider flex items-center gap-1">
                    ⚠ КЛЮЧОВА ЗАСТОРОГА JARVIS:
                  </span>
                  <span className="text-[9px] text-amber-200/90 font-sans mt-0.5 leading-snug">
                    {ALLOY_INFO[activeAlloy].danger}
                  </span>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* ОКУЛЯР ШТУЧНОГО ЗОРУ (Camera Scanner) */}
          <CameraScanner 
            onCapture={handleCameraCapture} 
            status={systemStatus} 
            activeBoard={boardType.toUpperCase()}
          />

          {/* Результат сканування (MD Report) */}
          {activeAnalysis && (
            <div className="bg-slate-900/80 border border-cyan-800/40 rounded-lg p-4 font-sans text-xs text-slate-300 leading-relaxed max-h-72 overflow-y-auto shadow-inner text-left">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-400 font-bold">
                  <CheckCircle className="w-3.5 h-3.5" /> СВІЖИЙ АНАЛІЗ ЗОБРАЖЕННЯ КОМПОНЕНТІВ J.V.S.
                </div>
                <button 
                  onClick={() => setActiveAnalysis('')} 
                  className="font-mono text-[9px] hover:text-white border border-slate-800 px-1 rounded hover:bg-slate-800"
                >
                  Очистити
                </button>
              </div>
              <div className="prose prose-invert prose-xs">
                {activeAnalysis.split('\n').map((line, idx) => {
                  if (line.startsWith('###')) {
                    return <h3 key={idx} className="font-mono font-bold text-slate-100 text-xs mt-2 border-l border-cyan-500 pl-1.5 uppercase tracking-wide">{line.replace('###', '').trim()}</h3>;
                  }
                  if (line.startsWith('##')) {
                    return <h2 key={idx} className="font-mono font-bold text-white text-sm my-2 pb-1 border-b border-cyan-950 uppercase">{line.replace('##', '').trim()}</h2>;
                  }
                  if (line.startsWith('-')) {
                    return <div key={idx} className="pl-3 py-0.5">• {line.replace('-', '').trim()}</div>;
                  }
                  return <p key={idx} className="mb-1 leading-normal text-slate-300">{line}</p>;
                })}
              </div>
            </div>
          )}

          {/* Смуга покрокового виконання */}
          <div className="h-14 bg-slate-900/80 border border-cyan-900/30 flex items-center px-4 justify-between rounded-lg">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-[10px] font-bold text-slate-200">ПОТОЧНИЙ ЕТАП: МОНТАЖ ТА КАЛІБРУВАННЯ СЕНСОРІВ ТА I2C-ЕКРАНІВ</span>
            </div>
            
            {/* Рівневі кроки */}
            <div className="flex gap-1.5">
              {[1, 2, 3].map((step) => {
                const isCheck = step <= (connections.filter(c => c.status === 'completed').length + 1);
                return (
                  <div 
                    key={step} 
                    className={`w-3.5 h-5 rounded-sm transition-colors duration-400 ${
                      isCheck ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-cyan-950/60 border border-cyan-900/40'
                    }`} 
                    title={`Крок калібрування ${step}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Відкриті верифіковані джерела пошуку */}
          {activeGrounding.length > 0 && (
            <div className="p-3 bg-slate-950 border border-teal-900/30 rounded-lg text-left text-xs">
              <p className="font-mono text-[9.5px] text-teal-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" /> Верифіковані інтернет джерела пошуку:
              </p>
              <div className="flex flex-wrap gap-2 text-[10px]">
                {activeGrounding.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 px-2 rounded bg-slate-900 border border-slate-880 text-slate-300 hover:text-cyan-400 hover:border-cyan-800 transition flex items-center gap-1"
                  >
                    <span>{item.title}</span> <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ПРАВИЙ СТОВПЧИК: Візуалізатор плат, Бібліотека пошуку та інтерактивна База Знань */}
        <aside className="col-span-12 lg:col-span-3 flex flex-col gap-4">
          
          {/* Схема з'єднань — показуємо лише коли вже є деталі/з'єднання */}
          {(components.length > 0 || connections.length > 0) && (
            <PinoutVisualizer
              project={activeProject}
              onToggleConnection={toggleSolderConnectionStatus}
            />
          )}

          {/* ІНТЕРАКТИВНА БАЗА ЗНАНЬ ТА ОНЛАЙН ВЕБ-ОНОВЛЕННЯ */}
          <div className="bg-slate-900/50 border border-cyan-900/30 text-left p-3 rounded-lg flex-1 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between border-b border-cyan-950 pb-1.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-400" /> Довідкова База Знань JARVIS
                </h2>
                <span className="text-[9px] bg-cyan-950 text-cyan-400 font-bold px-1 rounded">
                  {knowledgeBase.length} категорій
                </span>
              </div>

              {/* Таби бази знань */}
              <div className="flex justify-between border-b border-slate-800/60 pb-1 pt-1.5 gap-1">
                <button
                  onClick={() => setKbTab('component')}
                  className={`text-[9px] uppercase px-1.5 py-0.5 rounded transition ${
                    kbTab === 'component' ? 'bg-cyan-950 text-cyan-400 border border-cyan-900' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  🔌 Деталі
                </button>
                <button
                  onClick={() => setKbTab('tool')}
                  className={`text-[9px] uppercase px-1.5 py-0.5 rounded transition ${
                    kbTab === 'tool' ? 'bg-cyan-950 text-cyan-400 border border-cyan-900' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  🛠️ Інструменти
                </button>
                <button
                  onClick={() => setKbTab('material')}
                  className={`text-[9px] uppercase px-1.5 py-0.5 rounded transition ${
                    kbTab === 'material' ? 'bg-cyan-950 text-cyan-400 border border-cyan-900' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  🧪 Матеріали
                </button>
              </div>

              {/* Пошуковий інпут у базі знань */}
              <div className="mt-2 flex gap-1.5">
                <input
                  type="text"
                  value={kbSearch}
                  onChange={(e) => setKbSearch(e.target.value)}
                  placeholder="Швидкий пошук у довіднику..."
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-cyan-500 rounded p-1 px-2.5 text-[10px] text-slate-300 outline-none placeholder-slate-700"
                />
              </div>

              {/* Рендеринг відфільтрованої бази знань */}
              <div className="space-y-2 mt-2 max-h-40 overflow-y-auto pr-1">
                {filteredKb.length === 0 ? (
                  <p className="text-[10px] text-slate-600 italic py-2">Специфікацій не знайдено.</p>
                ) : (
                  filteredKb.map((entry) => (
                    <div key={entry.id} className="p-1.5 border border-slate-800/80 bg-slate-950/40 rounded text-[10px]">
                      <div className="flex justify-between items-start">
                        <strong className="text-white text-[10.5px] uppercase">{entry.name}</strong>
                        {entry.safeTemp && (
                          <span className="text-[8px] px-1 bg-amber-950/50 text-amber-300 border border-amber-900 rounded select-none font-sans shrink-0 uppercase">
                            🌡️ {entry.safeTemp}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 mt-1 pl-1 border-l border-slate-800 text-[9.5px] leading-tight">
                        {entry.description}
                      </p>
                      <p className="text-cyan-400/90 text-[9px] mt-1 bg-slate-950/50 p-1 rounded border border-slate-900 italic font-sans">
                        💡 Рекомендація: {entry.bestPractices}
                      </p>
                      {entry.sources && entry.sources.length > 0 && (
                        <div className="text-[8px] text-slate-500 mt-1 uppercase flex items-center gap-1">
                          <span className="font-bold">Верифіковані джерела:</span> {entry.sources.join(', ')}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI АВТОНОМНИЙ ІНТЕРНЕТ-ЗАВАНТАЖУВАЧ СПЕЦИФІКАЦІЙ */}
            <div className="pt-2 border-t border-cyan-950/60">
              <h3 className="text-[9px] font-bold text-teal-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                <span>🌐 Автономний синхронізатор бази</span>
                <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
              </h3>

              {/* Форма завантаження */}
              <form onSubmit={handleInternetKbUpdate} className="flex gap-1.5">
                <input
                  type="text"
                  value={kbSearchQuery}
                  onChange={(e) => setKbSearchQuery(e.target.value)}
                  placeholder="наприклад, 'BME280 sensor', 'NC-559 solder флюс'..."
                  className="flex-1 bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-cyan-500 rounded p-1 px-1.5 text-[10px] text-slate-200 outline-none placeholder-slate-700"
                />
                <button
                  type="submit"
                  disabled={kbUpdatingLog}
                  className="p-1 px-2 bg-teal-950 hover:bg-teal-900 border border-teal-800 disabled:opacity-50 text-teal-400 rounded text-[10px] flex items-center gap-1"
                  title="Знайти та синхронізувати в базу знань"
                >
                  {kbUpdatingLog ? <RefreshCw className="w-3 h-3 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                </button>
              </form>

              {kbSuccessAlert && (
                <div className="mt-1.5 p-1 bg-emerald-950/80 border border-emerald-800 rounded text-[9px] text-emerald-400 animate-pulse text-center uppercase font-bold">
                  ✓ Успішно досліджено Інтернет та оновлено базу знань!
                </div>
              )}
            </div>
          </div>

          {/* Журнал телеметрії та відладки */}
          <div className="bg-slate-900/50 border border-cyan-900/30 text-left p-3 rounded-lg max-h-40 overflow-hidden flex flex-col">
            <h3 className="text-xs font-bold text-slate-200 mb-2 border-b border-cyan-950 pb-1 flex items-center justify-between">
              <span>СИСТЕМНІ ЛОГИ / ACTIONS</span>
              <span className="text-[8px] opacity-50 uppercase">Live telemetry stream</span>
            </h3>
            <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 text-[9px] font-mono leading-tight">
              {logs.map((log) => (
                <div key={log.id} className="text-[#a1a1aa] hover:text-white transition py-0.5 border-b border-slate-900/40">
                  <span className="text-cyan-600 mr-1.5">[{log.timestamp}]</span>
                  <span className="text-slate-300 font-semibold mr-1 uppercase">| {log.title}:</span>
                  <span>{log.description}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ТЕРМІНАЛ КЕРУВАННЯ */}
      <footer className="h-auto md:h-16 bg-slate-900 border border-cyan-500/40 hover:border-cyan-500/70 transition dynamic-terminal rounded-lg flex flex-col md:flex-row items-center p-3 gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_#22d3ee]"></div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#a1a1aa] flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" /> CONSOLE_LINK_UKRAINE :
          </span>
        </div>
        
        {/* Живий термінал зв'язку з JARVIS з передачею контекстного досвіду */}
        <form onSubmit={handleChatSubmit} className="w-full flex-1 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Задайте питання JARVIS українською мовою... наприклад, 'Яка температура безпечна для OLED екрану?' чи 'Поясни заземлення'"
            className="flex-1 bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-cyan-500 outline-none rounded p-1.5 px-3 text-xs text-cyan-200 tracking-tight placeholder-cyan-900/40 font-sans"
          />
          {/* Живий режим — постійне слухання без кнопки, з перериванням */}
          <button
            type="button"
            onClick={() => { playJarvisSound(liveMode ? 'done' : 'listening'); setLiveMode(v => !v); }}
            className={`p-1.5 px-3 rounded border transition text-xs font-bold shrink-0 flex items-center justify-center gap-1 ${
              liveMode
                ? 'bg-emerald-900/80 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse'
                : 'bg-slate-950 border-cyan-900 text-cyan-500 hover:text-cyan-300 hover:border-cyan-700'
            }`}
            title={liveMode ? "Вимкнути живий режим" : "Живий режим — JARVIS слухає постійно (можна перебивати)"}
          >
            <span className="text-[9px] uppercase tracking-wider">{liveMode ? '● LIVE' : 'Live'}</span>
          </button>
          <button
            type="button"
            onClick={startVoiceListening}
            disabled={isTranscribing || liveMode}
            className={`p-1.5 px-3 rounded border transition text-xs font-bold shrink-0 flex items-center justify-center ${
              liveMode
                ? 'bg-slate-950 border-slate-850 text-slate-700 cursor-not-allowed'
                : isListening
                ? 'bg-red-950/90 border-red-500 text-red-400 font-bold shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse'
                : isTranscribing
                  ? 'bg-amber-950/80 border-amber-600 text-amber-400'
                  : 'bg-cyan-950 border-cyan-800 text-cyan-400 hover:bg-cyan-900 hover:text-white'
            }`}
            title={liveMode ? "У живому режимі мікрофон завжди активний" : isListening ? "Завершити запис і відправити" : isTranscribing ? "Розпізнавання мовлення..." : "Голосовий вхід — натисніть і говоріть українською"}
          >
            {isTranscribing
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <Mic className={`w-4 h-4 ${isListening ? 'animate-bounce' : ''}`} />}
          </button>
          <button
            type="submit"
            className="p-1 px-4 bg-cyan-950 border border-cyan-800 text-cyan-400 rounded text-xs font-bold hover:bg-cyan-900 hover:text-white uppercase transition tracking-wider shrink-0"
          >
            Виконати_
          </button>
        </form>

        <div className="text-[10px] text-cyan-700 font-bold uppercase tracking-widest select-none shrink-0 hidden md:block">
          AWAITING_INPUT_LINE
        </div>
      </footer>

      {/* ДІАЛОГИ З JARVIS */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-left shadow-2xl">
        <h3 className="text-xs font-mono font-bold uppercase text-slate-200 tracking-wider mb-2 flex items-center gap-1.5 border-b border-cyan-950 pb-1">
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" /> СЕСІЙНІ ДІАЛОГИ З JARVIS / CONTEXTUAL HISTORY
        </h3>
        <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
          {chatMessages.map((msg) => (
            <div 
              key={msg.id} 
              className={`p-2 rounded border text-xs leading-relaxed transition ${
                msg.sender === 'user' 
                  ? 'bg-slate-950/70 border-cyan-900/20 text-[#cbd5e1]'
                  : 'bg-cyan-950/20 border-cyan-900/30 text-cyan-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1 opacity-70 text-[9px] font-mono">
                <span className="font-bold uppercase tracking-wider">
                  {msg.sender === 'user' ? '👤 Sir / Користувач' : '🤖 J.V.S. Maker Core'}
                </span>
                <span>{msg.timestamp}</span>
              </div>
              <p className="whitespace-pre-line font-sans">{msg.text}</p>
              {msg.image && (
                <div className="mt-2 text-[10px] text-cyan-500 flex items-center gap-1">
                  <span className="p-0.5 px-1 bg-cyan-950 border border-cyan-900 rounded font-mono">Відеокадр завантажено в пам'ять</span>
                </div>
              )}
              {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                <div className="mt-2.5 pt-1.5 border-t border-cyan-950 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[9px] font-mono text-cyan-600 block mr-1 uppercase">Верифіковані інтернет джерела:</span>
                  {msg.groundingUrls.map((lnk, lIdx) => (
                    <a
                      key={lIdx}
                      href={lnk.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-0.5 px-1.5 bg-slate-950 border border-slate-850 hover:border-cyan-800 rounded text-[9.5px] text-[#94a3b8] hover:text-cyan-400 transition inline-flex items-center gap-1"
                    >
                      {lnk.title} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>
    </div>
  );
}
