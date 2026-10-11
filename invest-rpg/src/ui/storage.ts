// 기기 저장소 (localStorage). 사생활 보호 모드 등에서 막혀 있으면 메모리에만 둔다.

import type { SettingsStorage } from '../settings/settings.ts';
import { createSaveData, type SaveData } from '../engine/save.ts';

export const SAVE_KEY = 'invest-rpg.save';

export class BrowserStorage implements SettingsStorage {
  private readonly memory = new Map<string, string>();
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key) ?? this.memory.get(key) ?? null;
    } catch {
      return this.memory.get(key) ?? null;
    }
  }
  set(key: string, value: string): void {
    this.memory.set(key, value);
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // 저장 공간이 없거나 막힘: 메모리에만 (다음 실행 때 이어 하기 불가)
    }
  }
  remove(key: string): void {
    this.memory.delete(key);
    try {
      window.localStorage.removeItem(key);
    } catch {
      // 무시
    }
  }
}

export function loadSave(storage: SettingsStorage): SaveData {
  const text = storage.get(SAVE_KEY);
  if (!text) return createSaveData();
  try {
    return JSON.parse(text) as SaveData;
  } catch {
    return createSaveData();
  }
}

export function writeSave(storage: SettingsStorage, save: SaveData): void {
  storage.set(SAVE_KEY, JSON.stringify(save));
}
