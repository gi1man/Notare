import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// Mock Web Speech API if unsupported in jsdom
(window as any).SpeechRecognition = (window as any).SpeechRecognition || vi.fn();
(window as any).webkitSpeechRecognition = (window as any).webkitSpeechRecognition || vi.fn();
