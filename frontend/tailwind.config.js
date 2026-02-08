/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#0a0a0a',
                foreground: '#fafafa',
                card: '#141414',
                'card-hover': '#1a1a1a',
                border: '#262626',
                primary: '#3b82f6',
                secondary: '#8b5cf6',
                success: '#22c55e',
                warning: '#f59e0b',
                danger: '#ef4444',
            }
        },
    },
    plugins: [],
}
