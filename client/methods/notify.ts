import { addToast, closeAll, ToastProps } from "@heroui/react";

export function notify() {
    const AudioContext = window.AudioContext;
    const audioCtx = new AudioContext();

    const notes = [
        { frequency: 20000, duration: 0.3 },
        { frequency: 783.99, duration: 0.25 }, // G5
        { frequency: 659.25, duration: 0.25 }, // E5
        { frequency: 880.0, duration: 0.25 }, // A5
        { frequency: 698.46, duration: 0.25 }, // F5
        { frequency: 1046.5, duration: 0.5 }, // C6
    ];

    let currentTime = audioCtx.currentTime;

    notes.forEach((note) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = note.frequency;
        const [attack, release, volume] = [0.05, 0.2, 0.1];
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, currentTime + attack);
        gainNode.gain.setValueAtTime(volume, currentTime + note.duration - release);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + note.duration);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start(currentTime);
        oscillator.stop(currentTime + note.duration);

        currentTime += note.duration;
    });
}

export function toast({ ...props }: Partial<ToastProps>) {
    closeAll();
    addToast(props);
}
