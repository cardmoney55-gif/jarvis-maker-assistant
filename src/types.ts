/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ComponentPin {
  name: string;
  type: 'power' | 'ground' | 'digital' | 'analog' | 'communication' | 'general';
  description?: string;
  x: number; // percentage coordinate on vector canvas (0 - 100)
  y: number; // percentage coordinate on vector canvas (0 - 100)
}

export interface BoardDescriptor {
  id: string;
  name: string;
  image?: string;
  pins: ComponentPin[];
}

export interface SolderConnection {
  id: string;
  fromPin: string; // pin ID or name on core board
  toComponentId: string; // part target
  toComponentPin: string; // pin on the target part
  color: string; // wire color coding
  purpose: string;
  status: 'pending' | 'completed';
}

export interface CustomComponent {
  id: string;
  name: string;
  category: 'sensor' | 'actuator' | 'ic' | 'passive' | 'other';
  pinoutCount: number;
  pinoutDesc: Record<string, string>; // pin name to physical explanation
  alternatives: string[]; // better or alternative parts suggested by Jarvis
  datasheetSnippet?: string;
  notes?: string;
}

export interface MakerProject {
  id: string;
  name: string;
  description: string;
  boardType: 'esp32' | 'arduino' | 'rpipico';
  createdAt: string;
  components: CustomComponent[];
  connections: SolderConnection[];
}

export interface SystemHistoryLog {
  id: string;
  timestamp: string;
  title: string;
  type: 'research' | 'soldering' | 'scan' | 'system';
  description: string;
  meta?: any;
}

export interface ChatMessage {
  id: string;
  sender: 'jarvis' | 'user';
  text: string;
  timestamp: string;
  image?: string; // Optional base64 or source url of camera snapshot
  groundingUrls?: Array<{ title: string; url: string }>;
}
