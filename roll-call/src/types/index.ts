// 创建类型定义文件，并在其他文件中引用这些类型
export interface NameList {
  id: string;
  name: string;
  description: string;
  tags: string[];
  names: string[];
  createdAt: number;
  updatedAt: number;
}

export interface HistoryRecord {
  name: string;
  timestamp: number;
  names: string[];
  type: 'list' | 'selection';
  listId?: string;
}

export interface Config {
  mode: 'random' | 'sequential';
  randomAlgorithm: 'normal' | 'noise' | 'time';
  speechEnabled: boolean;
  speechRate: number;
  speechPitch: number;
  showAnimation: boolean;
} 