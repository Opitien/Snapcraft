import { DEFAULT_SETTINGS, ExtensionSettings } from '../types/screenshot';

const SETTINGS_KEY = 'snapcraft_settings';

/**
 * Get extension settings
 */
export async function getSettings(): Promise<ExtensionSettings> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      const result = await chrome.storage.sync.get(SETTINGS_KEY);
      return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] || {}) };
    }
  } catch (err) {
    console.warn('Could not read settings from chrome.storage.sync, falling back to local/default', err);
  }

  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const result = await chrome.storage.local.get(SETTINGS_KEY);
      return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] || {}) };
    }
  } catch (err) {
    console.warn('Could not read settings from chrome.storage.local', err);
  }

  return DEFAULT_SETTINGS;
}

/**
 * Save extension settings
 */
export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings();
  const updated: ExtensionSettings = { ...current, ...settings };

  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      await chrome.storage.sync.set({ [SETTINGS_KEY]: updated });
      return updated;
    }
  } catch (err) {
    console.warn('Could not save settings to chrome.storage.sync, trying local', err);
  }

  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [SETTINGS_KEY]: updated });
    }
  } catch (err) {
    console.warn('Could not save settings to chrome.storage.local', err);
  }

  return updated;
}
