export function lastIndexOf<T>(arr: T[], predicate: (item: T) => boolean) {
    let i = arr.length - 1;
    while (i >= 0) {
        if (predicate(arr[i])) {
            return i;
        } else {
            i--;
        }
    }

    return -1;
}