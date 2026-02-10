/// <reference types="vite/client" />

interface Window {
  api: {
    getItems: () => Promise<any[]>;
    addItem: (item: any) => Promise<any>;
    updateItem: (item: any) => Promise<any>;
    deleteItem: (id: number) => Promise<void>;
    [key: string]: (...args: any[]) => Promise<any>;
  };
}
