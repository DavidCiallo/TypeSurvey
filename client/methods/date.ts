export function formatDate(
    date: number | string | Date,
    format: "YYYYMMDD" | "YYYYMMDDHHmmss" | "YYYYMMDDHHmm" | "MMDDHHmm" = "MMDDHHmm",
    datesplit: "/" | "-" = "/"
): string {
    const d = new Date(date);

    if (isNaN(d.getTime())) {
        console.error("Invalid Date:", date);
        return "";
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");

    const dateFull = `${year}${datesplit}${month}${datesplit}${day}`;
    const dateShort = `${month}${datesplit}${day}`;

    switch (format) {
        case "YYYYMMDD":
            return dateFull;
        case "YYYYMMDDHHmmss":
            return `${dateFull} ${hours}:${minutes}:${seconds}`;
        case "YYYYMMDDHHmm":
            return `${dateFull} ${hours}:${minutes}`;
        case "MMDDHHmm":
            return `${dateShort} ${hours}:${minutes}`;
        default:
            return dateFull;
    }
}
export function sortDates(dateStrings: string[]): string[] {
    if (dateStrings.length === 0) return [];

    const dateObjects = dateStrings.map((str) => new Date(str)).sort((a, b) => a.getTime() - b.getTime());

    const result: string[] = [];
    result.push(...dateObjects.map((i) => i.toISOString()?.slice(0, 10).replaceAll("-", "/")));
    return result;
}

/**
 * @param {string[]} dateStrings - YYYY-MM-DD
 * @returns {string[][]} - [["start1", "end1"], ["singleDate"], ["start2", "end2"]]
 */
export function groupConsecutiveDates(dateStrings: string[]): string[][] {
    if (dateStrings.length === 0) return [];

    const dateObjects = dateStrings.map((str) => new Date(str)).sort((a, b) => a.getTime() - b.getTime());

    const result: string[][] = [];
    let currentGroup = [dateObjects[0]];

    for (let i = 1; i < dateObjects.length; i++) {
        const prevDate = dateObjects[i - 1];
        const currDate = dateObjects[i];

        const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

        if (dayDiff === 1) {
            currentGroup.push(currDate);
        } else {
            result.push(formatGroup(currentGroup));
            currentGroup = [currDate];
        }
    }

    result.push(formatGroup(currentGroup));

    function formatGroup(group: Date[]) {
        return group.length > 1 ? [formatDate(group[0]), formatDate(group[group.length - 1])] : [formatDate(group[0])];
    }

    return result;
}
