export const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

export const containsPattern = (value: string) => `%${escapeLike(value)}%`;
