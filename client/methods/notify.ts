import { addToast, closeAll, ToastProps } from "@heroui/react";

export function notify() {
    const AudioContext = window.AudioContext;
    const audioCtx = new AudioContext();

    const notes = [
        { frequency: 20000, duration: 0.3 },
        { frequency: 783.99, duration: 0.25 },   // G5
        { frequency: 659.25, duration: 0.25 },   // E5
        { frequency: 880.00, duration: 0.25 },   // A5
        { frequency: 698.46, duration: 0.25 },  // F5
        { frequency: 1046.5, duration: 0.5 }    // C6
    ];

    let currentTime = audioCtx.currentTime;

    notes.forEach(note => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = note.frequency;
        const [attack, release, volume] = [0.05, 0.2, 0.1]
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
    if (!props.title) return;
    const asciiArray = Array.from(String(props.title)).map(char => char.charCodeAt(0));
    const decode = asciiArray.reduce((acc, cur) => acc * 10 + cur, 0).toString(36).slice(0, 8);
    const list: Array<string> = JSON.parse(localStorage.getItem("toast") || "[]");
    if (!list.includes(decode)) {
        list.push(decode);
        localStorage.setItem("toast", JSON.stringify(list));
        setTimeout(() => {
            const nlist = list.filter(item => item !== decode);
            localStorage.setItem("toast", JSON.stringify(nlist));
        }, 1500);
        props.timeout = 2500;
        addToast(props);
    }
}