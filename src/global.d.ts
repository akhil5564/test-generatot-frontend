// src/global.d.ts
import 'jspdf';

declare global {
  interface Window {
    jsPDF: typeof import('jspdf');
  }
}