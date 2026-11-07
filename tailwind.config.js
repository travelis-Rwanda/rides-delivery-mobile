const plugin = require('tailwindcss/plugin');
const { platformColor, platformSelect } = require('nativewind/theme');
const { colors, aliases } = require('./src/constants/colors');

// RGB channels enable opacity utilities such as bg-primary/50. Separate alpha
// variables retain the exact supplied opacity for muted colors and dark accent.
function variables(palette) {
  return Object.fromEntries(
    Object.entries(palette).flatMap(([name, hex]) => {
      const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
      return [
        [`--color-${name}`, channels.join(' ')],
        [`--alpha-${name}`, hex.length === 9 ? parseInt(hex.slice(7), 16) / 255 : 1],
      ];
    }),
  );
}

const iosSystemColors = {
  primary: 'systemBlue',
  warning: 'systemOrange',
  destructive: 'systemRed',
  'accent-foreground': 'systemBlue',
};

const themeColors = Object.fromEntries(
  Object.keys(colors.light).map((name) => {
    const hasAlpha = colors.light[name].length === 9 || colors.dark[name].length === 9;
    const fallback = `rgb(var(--color-${name}) / ${hasAlpha ? `var(--alpha-${name})` : '<alpha-value>'})`;

    return [name, iosSystemColors[name]
      ? platformSelect({ ios: platformColor(iosSystemColors[name]), default: fallback })
      : fallback];
  }),
);

for (const [alias, name] of Object.entries(aliases)) {
  themeColors[alias] = themeColors[name];
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: { colors: themeColors },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ':root': variables(colors.light),
        '@media (prefers-color-scheme: dark)': {
          ':root': variables(colors.dark),
        },
      });
    }),
  ],
};
