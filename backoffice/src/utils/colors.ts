export interface ColorOption {
    value: string;      // stored value (Arabic)
    labelAr: string;
    labelEn: string;
    hex: string;
    light?: boolean;    // needs dark border
}

export const COLORS_LIST: ColorOption[] = [
    { value: 'أبيض',          labelAr: 'أبيض',          labelEn: 'White',      hex: '#FFFFFF',  light: true },
    { value: 'أسود',          labelAr: 'أسود',          labelEn: 'Black',      hex: '#1f2937' },
    { value: 'رمادي',         labelAr: 'رمادي',         labelEn: 'Gray',       hex: '#9ca3af' },
    { value: 'بيج',           labelAr: 'بيج',           labelEn: 'Beige',      hex: '#c9b99a',  light: true },
    { value: 'كريمي',         labelAr: 'كريمي',         labelEn: 'Cream',      hex: '#f5f0dc',  light: true },
    { value: 'أحمر',          labelAr: 'أحمر',          labelEn: 'Red',        hex: '#ef4444' },
    { value: 'وردي',          labelAr: 'وردي',          labelEn: 'Pink',       hex: '#f472b6' },
    { value: 'برتقالي',       labelAr: 'برتقالي',       labelEn: 'Orange',     hex: '#fb923c' },
    { value: 'أصفر',          labelAr: 'أصفر',          labelEn: 'Yellow',     hex: '#fbbf24',  light: true },
    { value: 'أخضر',          labelAr: 'أخضر',          labelEn: 'Green',      hex: '#22c55e' },
    { value: 'أخضر زيتي',    labelAr: 'أخضر زيتي',    labelEn: 'Olive',      hex: '#4a7c59' },
    { value: 'أزرق',          labelAr: 'أزرق',          labelEn: 'Blue',       hex: '#3b82f6' },
    { value: 'أزرق سماوي',   labelAr: 'أزرق سماوي',   labelEn: 'Sky Blue',   hex: '#38bdf8' },
    { value: 'أزرق كحلي',    labelAr: 'أزرق كحلي',    labelEn: 'Navy',       hex: '#1e3a8a' },
    { value: 'بنفسجي',        labelAr: 'بنفسجي',        labelEn: 'Purple',     hex: '#a855f7' },
    { value: 'بني',           labelAr: 'بني',           labelEn: 'Brown',      hex: '#92400e' },
    { value: 'كاكي',          labelAr: 'كاكي',          labelEn: 'Khaki',      hex: '#a1855f' },
    { value: 'ذهبي',          labelAr: 'ذهبي',          labelEn: 'Gold',       hex: '#d4a017' },
    { value: 'فضي',           labelAr: 'فضي',           labelEn: 'Silver',     hex: '#b0b7c3',  light: true },
    { value: 'متعدد الألوان', labelAr: 'متعدد الألوان', labelEn: 'Multicolor', hex: 'multicolor' },
];

// Full lookup map: Arabic name, English name (case-insensitive), hex codes
const RAW_MAP: Record<string, string> = {};
COLORS_LIST.forEach(c => {
    RAW_MAP[c.labelAr] = c.hex;
    RAW_MAP[c.labelEn.toLowerCase()] = c.hex;
});
// Extra English aliases stored in DB from old data
const ALIASES: Record<string, string> = {
    'blue': '#3b82f6', 'red': '#ef4444', 'green': '#22c55e', 'black': '#1f2937',
    'white': '#FFFFFF', 'gray': '#9ca3af', 'grey': '#9ca3af', 'beige': '#c9b99a',
    'cream': '#f5f0dc', 'pink': '#f472b6', 'orange': '#fb923c', 'yellow': '#fbbf24',
    'olive': '#4a7c59', 'sky blue': '#38bdf8', 'navy': '#1e3a8a', 'purple': '#a855f7',
    'brown': '#92400e', 'khaki': '#a1855f', 'gold': '#d4a017', 'silver': '#b0b7c3',
    'multicolor': 'multicolor', 'multi': 'multicolor', 'متعدد': 'multicolor',
};

export function getColorHex(name: string): string {
    if (!name) return '#e2e8f0';
    return RAW_MAP[name] ?? ALIASES[name.toLowerCase()] ?? '#e2e8f0';
}

export function isLightColor(name: string): boolean {
    const entry = COLORS_LIST.find(
        c => c.labelAr === name || c.labelEn.toLowerCase() === name.toLowerCase()
    );
    return entry?.light ?? false;
}
