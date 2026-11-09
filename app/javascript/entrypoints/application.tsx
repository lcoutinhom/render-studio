import React from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp, router } from '@inertiajs/react';
import '../styles/application.css';

const pages = import.meta.glob('../pages/**/*.tsx');
router.on('before', (event) => {
  const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
  if (token) event.detail.visit.headers['X-CSRF-Token'] = token;
});
router.on('success', (event) => {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');
  const token = event.detail.page.props.csrf_token;
  if (meta && typeof token === 'string') meta.content = token;
});
void createInertiaApp({
  title: (title) => `${title} · Render Studio`,
  resolve: async (name) => {
    const load = pages[`../pages/${name}.tsx`];
    if (!load) throw new Error(`Página indisponível: ${name}`);
    return await load() as { default: React.ComponentType };
  },
  setup({ el, App, props }) { createRoot(el).render(<App {...props} />); },
  progress: { color: '#b8862f', showSpinner: false, delay: 200 },
});
