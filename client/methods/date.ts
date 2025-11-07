export function sortDates(dateStrings: string[]): string[] {
    if (dateStrings.length === 0) return [];

    const dateObjects = dateStrings
        .map(str => new Date(str))
        .sort((a, b) => a.getTime() - b.getTime());

    const result: string[] = [];
    result.push(...dateObjects.map(i => i.toISOString()?.slice(0, 10).replaceAll('-', '/')));
    return result;
}

/**
 * 将连续的日期字符串数组合并为范围列表
 * @param {string[]} dateStrings - 日期字符串数组，格式为 "YYYY-MM-DD"
 * @returns {string[][]} - 返回合并后的日期范围数组，格式如 [["start1", "end1"], ["singleDate"], ["start2", "end2"]]
 */
export function groupConsecutiveDates(dateStrings: string[]): string[][] {
    if (dateStrings.length === 0) return [];

    const dateObjects = dateStrings
        .map(str => new Date(str))
        .sort((a, b) => a.getTime() - b.getTime());

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
        return group.length > 1
            ? [formatDate(group[0]), formatDate(group[group.length - 1])]
            : [formatDate(group[0])];
    }

    function formatDate(date: Date) {
        return date.toISOString()?.slice(0, 10).replaceAll('-', '/');
    }

    return result;
}