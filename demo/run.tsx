import { createRoot, Root } from 'react-dom/client';
import { App } from './App';
import React from 'react';

declare global {
    interface Window {
        _root: Root;
    }
}

const getRoot = (): Root => {
    return window._root ?? (window._root = createRoot(document.getElementById('root')!));
};

getRoot().render(<App />);
