export const serviceColors = [
    '#06b6d4', // Cyan 500
    '#f43f5e', // Rose 500
    '#f59e0b', // Amber 500
    '#10b981', // Emerald 500
    '#8b5cf6', // Violet 500
    '#ec4899', // Pink 500
    '#6366f1', // Indigo 500
    '#f97316', // Orange 500
    '#a855f7', // Purple 500
    '#14b8a6', // Teal 500
    '#3b82f6', // Blue 500
    '#d946ef', // Fuchsia 500
    '#0ea5e9', // Sky 500
    '#ef4444', // Red 500
    '#84cc16', // Lime 500
    '#22c55e', // Green 500
    '#eab308', // Yellow 500
    '#64748b', // Slate 500 (Refined)
    '#475569', // Slate 600
    '#be185d', // Rose 700
    '#0369a1', // Sky 700
    '#c2410c', // Orange 700
    '#7c3aed', // Violet 600
    '#0d9488', // Teal 600
    '#b91c1c', // Red 700
    '#15803d', // Green 700
    '#0e7490', // Cyan 700
    '#4338ca', // Indigo 700
];

export const getServiceColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % serviceColors.length;
    return serviceColors[index];
};
