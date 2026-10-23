module.exports = {
            content: ['./index.html', './pwa.js'],
            theme: {
                extend: {
                    fontFamily: {
                        fredoka: ['"Fredoka One"', 'cursive'],
                        nunito: ['Nunito', 'sans-serif'],
                    },
                    colors: {
                        brand: {
                            purple: '#7C3AED',
                            pink: '#EC4899',
                            yellow: '#F59E0B',
                            green: '#10B981',
                            blue: '#3B82F6',
                            dark: '#1E1B4B'
                        }
                    },
                    keyframes: {
                        float: {
                            '0%, 100%': { transform: 'translateY(0px)' },
                            '50%': { transform: 'translateY(-10px)' },
                        },
                        wowZoom: {
                            '0%': { transform: 'scale(0.2) rotate(-10deg)', opacity: '0' },
                            '50%': { transform: 'scale(1.25) rotate(5deg)' },
                            '70%': { transform: 'scale(0.95) rotate(-2deg)' },
                            '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' }
                        },
                        shake: {
                            '0%, 100%': { transform: 'translateX(0)' },
                            '20%, 60%': { transform: 'translateX(-10px)' },
                            '40%, 80%': { transform: 'translateX(10px)' }
                        }
                    },
                    animation: {
                        'bounce-short': 'bounce 0.4s ease-in-out 1',
                        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        'float': 'float 3s ease-in-out infinite',
                        'wow-zoom': 'wowZoom 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                        'shake': 'shake 0.4s ease-in-out'
                    }
                }
            }
        };
