async function trigger(event: CustomEvent | Array<CustomEvent>, callback: (event: CustomEvent) => void) {
    if (Array.isArray(event)) {
        for (const e of event) {
            callback(e.detail);
        }
    } else {
        callback(event);
    }
}