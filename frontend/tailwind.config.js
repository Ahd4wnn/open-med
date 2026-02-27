/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./public/index.html"
    ],
    theme: {
        extend: {
            colors: {
                primary: "#0EA5E9",
                danger: "#EF4444",
                warning: "#F59E0B",
                success: "#10B981",
                dark: "#0F172A",
            }
        },
    },
    plugins: [],
}
