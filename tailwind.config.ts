import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'sans': ['Inter', 'system-ui', 'sans-serif'],
				'heading': ['Poppins', 'system-ui', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: {
					DEFAULT: 'hsl(var(--background))',
					secondary: 'hsl(var(--background-secondary))',
					tertiary: 'hsl(var(--background-tertiary))',
				},
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					bright: 'hsl(var(--primary-bright))',
					dark: 'hsl(var(--primary-dark))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
					glass: 'hsl(var(--card-glass))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Sci-Fi Accent Colors
				'transcript-cyan': 'hsl(var(--transcript-cyan))',
				'neon-gold': 'hsl(var(--neon-gold))',
				'success': 'hsl(var(--success))',
				'warning': 'hsl(var(--warning))',
				'info': 'hsl(var(--info))'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			perspective: {
				'1000': '1000px',
				'1500': '1500px',
			},
			backdropBlur: {
				'glass': '16px',
			},
			boxShadow: {
				'neon': '0 0 20px hsl(var(--primary) / 0.6)',
				'card-3d': '0 8px 32px hsl(240 10% 3% / 0.5)',
				'glow': '0 0 40px hsl(var(--primary) / 0.4)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0', opacity: '0' },
					to: { height: 'var(--radix-accordion-content-height)', opacity: '1' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
					to: { height: '0', opacity: '0' }
				},
				'slide-in-bottom': {
					'0%': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
					'100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
				},
				'fade-in-scale': {
					'0%': { opacity: '0', transform: 'scale(0.8) rotateY(180deg)' },
					'100%': { opacity: '1', transform: 'scale(1) rotateY(0deg)' }
				},
				'mic-pulse': {
					'0%, 100%': { 
						boxShadow: '0 0 20px hsl(var(--primary) / 0.4)',
						transform: 'scale(1)' 
					},
					'50%': { 
						boxShadow: '0 0 40px hsl(var(--primary) / 0.8)',
						transform: 'scale(1.05)' 
					}
				},
				'text-glow': {
					'0%, 100%': { filter: 'brightness(1)', textShadow: '0 0 10px hsl(var(--transcript-cyan) / 0.3)' },
					'50%': { filter: 'brightness(1.2)', textShadow: '0 0 20px hsl(var(--transcript-cyan) / 0.6)' }
				},
				'card-hover': {
					'0%': { transform: 'translateY(0) rotateX(0deg)' },
					'100%': { transform: 'translateY(-4px) rotateX(5deg)' }
				},
				'neon-pulse': {
					'0%, 100%': { borderColor: 'hsl(var(--primary))', boxShadow: '0 0 10px hsl(var(--primary) / 0.5)' },
					'50%': { borderColor: 'hsl(var(--primary-bright))', boxShadow: '0 0 20px hsl(var(--primary) / 0.8)' }
				},
				'shake': {
					'0%, 100%': { transform: 'translateX(0)' },
					'25%': { transform: 'translateX(-4px)' },
					'75%': { transform: 'translateX(4px)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.3s ease-out',
				'accordion-up': 'accordion-up 0.3s ease-out',
				'slide-in-bottom': 'slide-in-bottom 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
				'fade-in-scale': 'fade-in-scale 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
				'mic-pulse': 'mic-pulse 2s ease-in-out infinite',
				'text-glow': 'text-glow 3s ease-in-out infinite alternate',
				'card-hover': 'card-hover 0.3s ease-out',
				'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
				'shake': 'shake 0.5s ease-in-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
