// 游戏音效钩子 — 翻档案 / 盖印章 / 庄重开场
import { useCallback, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';

// Web 环境不支持 expo-audio 的 require() 资源，静默降级
const IS_WEB = process.env.EXPO_OS === 'web';

// eslint-disable-next-line no-undef
const FLIP_SRC    = require('../../assets/sounds/flip.wav') as number;
// eslint-disable-next-line no-undef
const STAMP_SRC   = require('../../assets/sounds/stamp.wav') as number;
// eslint-disable-next-line no-undef
const FANFARE_SRC = require('../../assets/sounds/fanfare.wav') as number;

export function useGameSounds() {
  const flipPlayer    = useAudioPlayer(IS_WEB ? null : FLIP_SRC);
  const stampPlayer   = useAudioPlayer(IS_WEB ? null : STAMP_SRC);
  const fanfarePlayer = useAudioPlayer(IS_WEB ? null : FANFARE_SRC);

  // 翻档案：每次调用重置到开头播放
  const playFlip = useCallback(() => {
    if (IS_WEB) return;
    try {
      flipPlayer.seekTo(0);
      flipPlayer.play();
    } catch {
      // 静默忽略音效错误，不影响主流程
    }
  }, [flipPlayer]);

  // 盖印章：点击确认按钮时播放
  const playStamp = useCallback(() => {
    if (IS_WEB) return;
    try {
      stampPlayer.seekTo(0);
      stampPlayer.play();
    } catch {
      // 静默忽略
    }
  }, [stampPlayer]);

  // 庄重开场：建档成功时播放
  const playFanfare = useCallback(() => {
    if (IS_WEB) return;
    try {
      fanfarePlayer.seekTo(0);
      fanfarePlayer.play();
    } catch {
      // 静默忽略
    }
  }, [fanfarePlayer]);

  return { playFlip, playStamp, playFanfare };
}

/**
 * 节流版翻档音效 — 快速连续触发时防止重叠（300ms 内最多播一次）
 */
export function useThrottledFlip(intervalMs = 300) {
  const { playFlip } = useGameSounds();
  const lastRef = useRef(0);
  return useCallback(() => {
    const now = Date.now();
    if (now - lastRef.current >= intervalMs) {
      lastRef.current = now;
      playFlip();
    }
  }, [playFlip, intervalMs]);
}
