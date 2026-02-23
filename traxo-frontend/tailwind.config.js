/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        // ── Tokens semánticos (auto-switch light/dark via CSS vars) ──────
        // Fondos
        'fondo-base':    'rgb(var(--fondo-base)     / <alpha-value>)',
        'fondo-tarjeta': 'rgb(var(--fondo-tarjeta)  / <alpha-value>)',
        'fondo-input':   'rgb(var(--fondo-input)    / <alpha-value>)',
        // Texto
        principal:    'rgb(var(--principal)   / <alpha-value>)',
        secundario:   'rgb(var(--secundario)  / <alpha-value>)',
        atenuado:     'rgb(var(--atenuado)    / <alpha-value>)',
        // Bordes
        borde:        'rgb(var(--borde)        / <alpha-value>)',
        'borde-sutil':'rgb(var(--borde-sutil)  / <alpha-value>)',
        // Marca
        primario: {
          DEFAULT: 'rgb(var(--primario)       / <alpha-value>)',
          hover:   'rgb(var(--primario-hover) / <alpha-value>)',
          tenue:   'rgb(var(--primario-tenue) / <alpha-value>)',
        },
        acento: 'rgb(var(--acento) / <alpha-value>)',
        // Texto sobre fondo de marca (hero/auth gradient)
        'sobre-marca': 'rgb(var(--sobre-marca) / <alpha-value>)',
        // Estados
        error: {
          DEFAULT: 'rgb(var(--error)       / <alpha-value>)',
          fondo:   'rgb(var(--error-fondo) / <alpha-value>)',
          borde:   'rgb(var(--error-borde) / <alpha-value>)',
          tenue:   'rgb(var(--error-tenue) / <alpha-value>)',
        },
        exito: {
          DEFAULT: 'rgb(var(--exito)       / <alpha-value>)',
          fondo:   'rgb(var(--exito-fondo) / <alpha-value>)',
        },
        aviso: {
          DEFAULT: 'rgb(var(--aviso)       / <alpha-value>)',
          fondo:   'rgb(var(--aviso-fondo) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};
