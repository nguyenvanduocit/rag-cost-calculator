import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

export interface UrlStateManager {
  saveState: (data: any) => void;
  loadState: () => any | null;
}

export function createUrlStateManager(): UrlStateManager {
  return {
    saveState: (data: any) => {
      const compressed = compressToEncodedURIComponent(JSON.stringify(data));
      window.location.hash = compressed;
    },
    
    loadState: () => {
      const hash = window.location.hash.slice(1); // Remove the # symbol
      if (!hash) return null;
      
      try {
        const decompressed = decompressFromEncodedURIComponent(hash);
        return decompressed ? JSON.parse(decompressed) : null;
      } catch (error) {
        console.error('Error loading state from URL:', error);
        return null;
      }
    }
  };
} 