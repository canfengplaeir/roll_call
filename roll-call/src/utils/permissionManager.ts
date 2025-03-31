/**
 * 权限管理工具
 * 处理权限请求和状态管理，特别是针对麦克风访问
 */

// 权限状态类型
export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

// 存储不同权限的状态
const permissionStatus: Record<string, PermissionStatus> = {
  microphone: 'prompt', // 默认为提示状态
};

/**
 * 检查浏览器是否支持权限API
 */
export function isPermissionSupported(): boolean {
  return 'permissions' in navigator && 'query' in navigator.permissions;
}

/**
 * 检查音频API是否可用
 */
export function isAudioContextSupported(): boolean {
  return !!(window.AudioContext || (window as any).webkitAudioContext);
}

/**
 * 获取麦克风权限的当前状态
 */
export async function getMicrophonePermission(): Promise<PermissionStatus> {
  // 如果不支持权限API，检查是否支持AudioContext
  if (!isPermissionSupported()) {
    return isAudioContextSupported() ? 'prompt' : 'unsupported';
  }
  
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    permissionStatus.microphone = result.state as PermissionStatus;
    
    // 监听权限变化
    result.onchange = () => {
      permissionStatus.microphone = result.state as PermissionStatus;
    };
    
    return permissionStatus.microphone;
  } catch (error) {
    console.error('获取麦克风权限状态失败:', error);
    return 'prompt'; // 默认为提示状态
  }
}

/**
 * 请求麦克风权限
 * @returns 授权结果
 */
export async function requestMicrophonePermission(): Promise<PermissionStatus> {
  // 如果不支持 AudioContext，则不支持麦克风功能
  if (!isAudioContextSupported()) {
    return 'unsupported';
  }
  
  try {
    // 请求麦克风权限
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // 成功获取流，立即释放资源
    stream.getTracks().forEach(track => track.stop());
    
    permissionStatus.microphone = 'granted';
    return 'granted';
  } catch (error) {
    console.error('请求麦克风权限失败:', error);
    
    // 根据错误类型判断结果
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        permissionStatus.microphone = 'denied';
        return 'denied';
      }
    }
    
    permissionStatus.microphone = 'prompt';
    return 'prompt';
  }
}

/**
 * 获取友好的错误消息
 */
export function getPermissionErrorMessage(status: PermissionStatus): string {
  switch (status) {
    case 'denied':
      return '麦克风权限已被拒绝，请在浏览器设置中允许访问麦克风。';
    case 'unsupported':
      return '您的浏览器不支持麦克风访问功能，将使用普通随机算法代替。';
    default:
      return '无法访问麦克风，将使用普通随机算法代替。';
  }
} 