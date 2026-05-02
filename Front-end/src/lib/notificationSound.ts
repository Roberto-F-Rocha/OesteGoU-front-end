let lastPlayedAt = 0;

export function playNotificationHorn() {
  const now = Date.now();
  if (now - lastPlayedAt < 900) return;
  lastPlayedAt = now;

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  masterGain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.55);
  masterGain.connect(audioContext.destination);

  const notes = [220, 293.66];

  notes.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = audioContext.currentTime + index * 0.18;
    const end = start + 0.16;

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.08, end);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  });

  window.setTimeout(() => audioContext.close().catch(() => undefined), 900);
}
