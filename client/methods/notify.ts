import {
    toast as sonnerToast,
} from "@/client/components/ui/sonner";

type HeroUIColor = "success" | "danger" | "warning" | "default" | "primary" | "secondary" | undefined;

type LegacyToastProps = {
    title?: string;
    description?: string;
    color?: HeroUIColor;
};

const colorToType = (color?: HeroUIColor): "success" | "error" | "info" => {
    if (color === "success") return "success";
    if (color === "danger") return "error";
    return "info";
};

export function notify() {
    const AudioContext = window.AudioContext;
    const audioCtx = new AudioContext();

    const notes = [
        { frequency: 20000, duration: 0.3 },
        { frequency: 783.99, duration: 0.25 },
        { frequency: 659.25, duration: 0.25 },
        { frequency: 880.0, duration: 0.25 },
        { frequency: 698.46, duration: 0.25 },
        { frequency: 1046.5, duration: 0.5 },
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

export function toast({ title, color }: LegacyToastProps) {
    sonnerToast(title || "", colorToType(color));
}
