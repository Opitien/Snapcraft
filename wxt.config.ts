import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'SnapCraft - Chrome Screenshot & Annotation Tool',
    description: 'Capture visible viewport, full scrollable page, or custom draggable areas with instant offline editor and history.',
    version: '1.0.0',
    icons: {
      16: 'icon-16.png',
      32: 'icon-32.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
    action: {
      default_title: 'SnapCraft Screenshot',
      default_icon: {
        16: 'icon-16.png',
        32: 'icon-32.png',
        48: 'icon-48.png',
        128: 'icon-128.png',
      }
    },
    permissions: [
      'activeTab',
      'scripting',
      'storage',
      'downloads'
    ],
    commands: {
      'visible-capture': {
        suggested_key: {
          default: 'Alt+Shift+V',
          mac: 'Alt+Shift+V'
        },
        description: 'Capture visible viewport'
      },
      'full-page-capture': {
        suggested_key: {
          default: 'Alt+Shift+F',
          mac: 'Alt+Shift+F'
        },
        description: 'Capture full scrollable webpage'
      },
      'area-capture': {
        suggested_key: {
          default: 'Alt+Shift+A',
          mac: 'Alt+Shift+A'
        },
        description: 'Select custom area to capture'
      }
    }
  }
});
