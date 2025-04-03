/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // กำหนดให้ Tailwind สแกนหา class ในไฟล์เหล่านี้
  ],
  theme: {
    extend: {}, // ส่วนขยาย theme (ถ้ามี)
  },
  plugins: [require("daisyui")], // เปิดใช้งาน DaisyUI plugin
  daisyui: {
    themes: [
      "light",
      "dark",
      "halloween",
      "cupcake",
      "bumblebee",
      "emerald",
      "corporate",
      "synthwave",
      "retro",
      "cyberpunk",
      "valentine",
      "garden",
      "forest",
      "aqua",
      "lofi",
      "pastel",
      "fantasy",
      "wireframe",
      "black",
      "luxury",
      "dracula",
      "cmyk",
      "autumn",
      "business",
      "acid",
      "lemonade",
      "night",
      "coffee",
      "winter"
    ],
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: true,
    themeRoot: ":root",
  },
}
