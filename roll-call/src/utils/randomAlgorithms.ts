/**
 * 随机算法工具
 * 实现三种随机算法：普通随机、噪声随机和时间随机
 */
import { getMicrophonePermission, requestMicrophonePermission } from './permissionManager';
import type { PermissionStatus } from './permissionManager';

// 一个用于缓存权限状态的变量，避免重复请求
let microphonePermissionStatus: PermissionStatus | null = null;

// 优化音频上下文和分析器的初始化和管理
let audioContextInstance: {
  context: AudioContext | null;
  analyser: AnalyserNode | null;
  stream: MediaStream | null;
  dataArray: Uint8Array | null;
} = {
  context: null,
  analyser: null,
  stream: null,
  dataArray: null
};

// 优化音频初始化函数
const initAudioAnalyser = async () => {
  try {
    // 如果已经初始化，直接返回
    if (audioContextInstance.context && 
        audioContextInstance.analyser && 
        audioContextInstance.stream) {
      return true;
    }

    // 创建音频上下文
    audioContextInstance.context = new AudioContext();

    // 配置音频流选项
    const constraints = {
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1
      }
    };

    // 获取音频流
    audioContextInstance.stream = await navigator.mediaDevices.getUserMedia(constraints);

    // 创建分析器节点
    audioContextInstance.analyser = audioContextInstance.context.createAnalyser();
    audioContextInstance.analyser.fftSize = 2048; // 增加FFT大小以获得更多数据点
    audioContextInstance.analyser.smoothingTimeConstant = 0; // 禁用平滑以获得原始数据

    // 创建音频源并连接
    const source = audioContextInstance.context.createMediaStreamSource(audioContextInstance.stream);
    source.connect(audioContextInstance.analyser);

    // 创建数据数组
    audioContextInstance.dataArray = new Uint8Array(audioContextInstance.analyser.frequencyBinCount);

    return true;
  } catch (err) {
    console.error('初始化音频分析器失败:', err);
    cleanupAudio();
    return false;
  }
};

// 优化噪声数据采集
const getNoiseData = (): number[] => {
  if (!audioContextInstance.analyser || !audioContextInstance.dataArray) {
    return [];
  }

  try {
    // 获取时域数据和频域数据
    audioContextInstance.analyser.getByteTimeDomainData(audioContextInstance.dataArray);
    const timeDomainData = [...audioContextInstance.dataArray];
    
    audioContextInstance.analyser.getByteFrequencyData(audioContextInstance.dataArray);
    const frequencyData = [...audioContextInstance.dataArray];

    // 合并两种数据以增加随机性
    return [...timeDomainData, ...frequencyData];
  } catch (err) {
    console.error('获取噪声数据失败:', err);
    return [];
  }
};

// 使用噪声数据生成随机种子
const generateNoiseSeed = (data: number[]): number => {
  if (data.length === 0) return Date.now();
  
  // 使用噪声数据计算种子
  const seed = data.reduce((acc, val, idx) => {
    // 使用位运算和质数来增加随机性
    return acc + (val * (idx + 1) * 31);
  }, 0);
  
  return seed;
};

// 基于种子生成随机数
const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

// 优化噪声随机算法
export const getRandomIndexByNoise = async (length: number): Promise<number> => {
  try {
    const isInitialized = await initAudioAnalyser();
    if (!isInitialized) {
      return getRandomIndexByNormal(length);
    }

    // 收集多个样本
    const samples: number[][] = [];
    for (let i = 0; i < 3; i++) {
      const data = getNoiseData();
      if (data.length > 0) {
        samples.push(data);
      }
      // 使用更短的延迟
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    if (samples.length === 0) {
      return getRandomIndexByNormal(length);
    }

    // 使用更复杂的随机数生成算法
    const timestamp = performance.now();
    const seed = samples.reduce((acc, sample, sampleIndex) => {
      return sample.reduce((innerAcc, value, valueIndex) => {
        const weight = Math.sin(timestamp + sampleIndex + valueIndex);
        return innerAcc + (value * weight);
      }, acc);
    }, 0);

    // 使用加密API生成最终随机数
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setFloat64(0, Math.abs(seed));
    const array = new Uint8Array(buffer);
    let finalValue = 0;
    for (let i = 0; i < array.length; i++) {
      finalValue = (finalValue * 256 + array[i]) % length;
    }

    return finalValue;
  } catch (err) {
    console.error('噪声随机生成失败:', err);
    return getRandomIndexByNormal(length);
  }
};

// 导出普通随机算法
export const getRandomIndexByNormal = (length: number): number => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % length;
};

// 优化时间随机算法
export const getRandomIndexByTime = (length: number): number => {
  const timestamp = performance.now();
  const date = new Date();
  const timeValues = [
    date.getMilliseconds(),
    date.getSeconds(),
    date.getMinutes(),
    timestamp
  ];
  
  // 使用多个时间值生成随机数
  const seed = timeValues.reduce((acc, value, index) => {
    return acc + (value * Math.sin(timestamp + index));
  }, 0);

  return Math.abs(Math.floor(seed)) % length;
};

// 导出清理函数
export const cleanupRandomAlgorithms = () => {
  cleanupAudio();
};

/**
 * 普通随机算法 - 使用Crypto API
 * @param max 最大值（不包含）
 * @returns 随机整数
 */
export const normalRandom = (max: number): number => {
  // 如果支持Crypto API，使用更安全的随机数生成
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % max;
  }
  
  // 降级为Math.random
  return Math.floor(Math.random() * max);
};

/**
 * 噪声随机算法 - 通过音频采样产生随机数
 * 注意：此功能需要用户授权麦克风
 * @param max 最大值（不包含）
 * @returns Promise<{value: number, permissionStatus: PermissionStatus}>
 */
export const noiseRandom = async (max: number): Promise<{value: number, permissionStatus: PermissionStatus}> => {
  try {
    // 先检查权限状态
    if (microphonePermissionStatus === null) {
      microphonePermissionStatus = await getMicrophonePermission();
    }
    
    // 如果需要请求权限
    if (microphonePermissionStatus === 'prompt') {
      microphonePermissionStatus = await requestMicrophonePermission();
    }
    
    // 如果权限被拒绝或不支持，使用备用算法
    if (microphonePermissionStatus !== 'granted') {
      return {
        value: normalRandom(max),
        permissionStatus: microphonePermissionStatus
      };
    }
    
    // 创建音频上下文
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContext();
    
    // 请求麦克风权限（已经获得过同意，所以这里不应该再次请求）
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // 创建音频源
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    // 连接节点
    source.connect(analyser);
    
    // 获取音频数据
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    // 计算音频数据总和
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    
    // 关闭音频轨道
    stream.getTracks().forEach(track => track.stop());
    
    // 关闭音频上下文
    if (audioContext.state !== 'closed') {
      await audioContext.close();
    }
    
    // 使用总和计算随机值
    return {
      value: sum % max,
      permissionStatus: 'granted'
    };
  } catch (error) {
    console.error('噪声随机算法错误:', error);
    
    // 检查错误类型并更新权限状态
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        microphonePermissionStatus = 'denied';
      }
    }
    
    // 降级为普通随机
    return {
      value: normalRandom(max),
      permissionStatus: microphonePermissionStatus || 'denied'
    };
  }
};

/**
 * 时间随机算法 - 使用高精度时间戳
 * @param max 最大值（不包含）
 * @returns 随机整数
 */
export const timeRandom = (max: number): number => {
  // 获取高精度时间戳
  const now = performance.now();
  // 将时间戳转换为毫秒并取模
  const randomValue = Math.floor(now * 1000) % 1000;
  // 映射到范围
  return randomValue % max;
};

/**
 * 使用不同算法获取随机索引
 * @param length 数组长度
 * @param algorithm 使用的随机算法
 * @param excluded 排除的索引（可选）
 * @param callbackFn 权限状态回调（可选）
 */
export async function getRandomIndex(
  length: number, 
  algorithm: 'normal' | 'noise' | 'time' = 'normal', 
  excluded: number[] = [],
  callbackFn?: (status: PermissionStatus) => void
): Promise<number> {
  let index: number;
  
  // 如果所有索引都被排除，则返回-1
  if (excluded.length >= length) {
    return -1;
  }
  
  do {
    switch (algorithm) {
      case 'noise':
        try {
          const result = await getNoiseRandomIndex(length);
          
          // 通知调用者权限状态
          if (callbackFn && result.permissionStatus) {
            callbackFn(result.permissionStatus);
          }
          
          index = result.value;
        } catch (error) {
          console.error('噪声随机索引生成失败:', error);
          index = getNormalRandomIndex(length);
          
          // 通知调用者出现错误
          if (callbackFn) {
            callbackFn('denied');
          }
        }
        break;
        
      case 'time':
        index = getTimeRandomIndex(length);
        break;
        
      case 'normal':
      default:
        index = getNormalRandomIndex(length);
    }
  } while (excluded.includes(index));
  
  return index;
}

// 使用标准随机数生成器
function getNormalRandomIndex(length: number): number {
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % length;
  }
  return Math.floor(Math.random() * length);
}

// 使用时间戳作为随机种子
function getTimeRandomIndex(length: number): number {
  const now = performance.now();
  const timeHash = Math.abs(Math.sin(now) * 10000);
  return Math.floor(timeHash % length);
}

// 使用噪声算法
async function getNoiseRandomIndex(length: number): Promise<{value: number, permissionStatus: PermissionStatus}> {
  try {
    // 尝试使用实际的噪声算法
    return await noiseRandom(length);
  } catch (error) {
    console.error('噪声随机索引生成失败:', error);
    
    // 回退到简化版本
    const noise = performance.now() * Math.random();
    return {
      value: Math.floor(noise % length),
      permissionStatus: 'denied'
    };
  }
}

// 优化资源清理
const cleanupAudio = () => {
  try {
    if (audioContextInstance.stream) {
      audioContextInstance.stream.getTracks().forEach(track => track.stop());
    }
    if (audioContextInstance.context && audioContextInstance.context.state !== 'closed') {
      audioContextInstance.context.close();
    }
  } catch (err) {
    console.error('清理音频资源失败:', err);
  } finally {
    audioContextInstance = {
      context: null,
      analyser: null,
      stream: null,
      dataArray: null
    };
  }
}; 