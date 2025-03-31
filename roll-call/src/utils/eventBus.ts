import { reactive } from 'vue';

export type EventCallback = (...args: any[]) => void;

interface EventHandlers {
  [key: string]: EventCallback[];
}

class EventBus {
  private handlers: EventHandlers = reactive({});

  public on(event: string, callback: EventCallback): void {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(callback);
  }

  public off(event: string, callback?: EventCallback): void {
    if (!this.handlers[event]) return;
    
    if (!callback) {
      this.handlers[event] = [];
    } else {
      this.handlers[event] = this.handlers[event].filter(
        handler => handler !== callback
      );
    }
  }

  public emit(event: string, ...args: any[]): void {
    if (this.handlers[event]) {
      this.handlers[event].forEach(callback => {
        callback(...args);
      });
    }
  }

  public once(event: string, callback: EventCallback): void {
    const onceCallback: EventCallback = (...args: any[]) => {
      callback(...args);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }
}

export default new EventBus(); 