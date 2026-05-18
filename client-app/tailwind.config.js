/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Rajdhani', 'sans-serif'],
            },
            colors: {
                obsidian: {
                    DEFAULT: '#0a0a0b',
                    light: '#161618',
                    lighter: '#1c1c1f',
                },
                neon: {
                    cyan: '#22d3ee',
                    magenta: '#d946ef',
                    purple: '#a855f7',
                },
                magenta: {
                    50: '#fdf2f8',
                    100: '#fce7f3',
                    200: '#fbcfe8',
                    300: '#f9a8d4',
                    400: '#f472b6',
                    500: '#ec4899',
                    600: '#db2777',
                    700: '#be185d',
                    800: '#9d174d',
                    900: '#831843',
                },
                cyan: {
                    50: '#ecfeff',
                    100: '#cffafe',
                    200: '#a5f3fc',
                    300: '#67e8f9',
                    400: '#22d3ee',
                    500: '#06b6d4',
                    600: '#0891b2',
                    700: '#0e7490',
                    800: '#155e75',
                    900: '#164e63',
                }
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'futuristic-glow': 'radial-gradient(circle at center, rgba(34, 211, 238, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow-cyan': 'glowCyan 2s ease-in-out infinite alternate',
            },
            keyframes: {
                glowCyan: {
                    '0%': { boxShadow: '0 0 5px rgba(34, 211, 238, 0.2)' },
                    '100%': { boxShadow: '0 0 20px rgba(34, 211, 238, 0.6)' },
                }
            }
        },
    },
    plugins: [],
}
