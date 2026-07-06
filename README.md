<p align="center"><img src="public/logo.png" alt="GlTV" width="170"></p>

## 🎬 GlTV — Tu cine personal en el navegador

![typing](https://readme-typing-svg.demolab.com?font=Nunito&weight=800&size=24&duration=2500&pause=800&color=E50914&center=true&vCenter=true&width=520&lines=Pel%C3%ADculas+%F0%9F%8D%BF;Series+%F0%9F%93%BA;Anime+%E2%9B%A9%EF%B8%8F;Todo+en+espa%C3%B1ol+latino+%F0%9F%8C%8E;Sin+backend.+Sin+build.+Sin+drama.)  
 

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)  
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)  
![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)  
![PWA](https://img.shields.io/badge/PWA-instalable-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)

![Sin dependencias](https://img.shields.io/badge/dependencias-0-46d369?style=flat-square)  
![Sin build](https://img.shields.io/badge/build-no%20necesita-46d369?style=flat-square)  
![Idioma](https://img.shields.io/badge/audio-espa%C3%B1ol%20latino-e50914?style=flat-square)  
![Servidores](https://img.shields.io/badge/servidores-11-e50914?style=flat-square)

**GlTV** es la versión web responsive de un clon de Netflix que nació como widget de escritorio  
(Quickshell/QML sobre Hyprland). Catálogo de películas, series y anime con metadatos en  
español latino, hero rotativo, mi lista, seguir viendo y reproducción en 11 servidores.

_No aloja ni descarga contenido: es un front-end que agrega catálogos públicos y reproductores embed de terceros._

## 🕹️ SELECT YOUR QUEST

|   | Misión | Recompensa |
| --- | --- | --- |
| 🍿 | Explorar **Populares / Tendencias / Recién agregadas** | Siempre hay algo nuevo que ver |
| 🔎 | **Buscar** cualquier título (debounce ninja de 400 ms) | Resultados al instante, con historial de búsquedas |
| 🎭 | Filtrar por **género** y ordenar por año/título/puntaje | El catálogo, a tu manera |
| ⭐ | Armar **Mi lista** | Tus favoritos te esperan en el home |
| ▶️ | Reproducir y dejar a medias | **Seguir viendo** con barra de progreso real |
| ⏭️ | Botón **siguiente episodio** en el historial | Maratonear sin pensar |
| 🎬 | Ver **tráilers**, reparto, dirección y géneros | Ficha completa estilo Netflix |
| 🧲 | Fila **"Más como esto"** en cada título | Un hoyo de conejo infinito |
| 📱 | **Instalarla como app** (PWA) | GlTV en tu teléfono, pantalla completa |

## 🏆 LOGROS DESBLOQUEADOS

```plaintext
🥇 CERO DEPENDENCIAS ─────────── HTML + CSS + JS puro. Ni un npm install.
🥇 MODO OFFLINE ──────────────── Service worker cachea el shell de la app.
🥇 SESIÓN INMORTAL ───────────── Cierra y vuelve: pestaña, género, página,
                                 orden y búsqueda se restauran solos.
🥇 SPEEDRUN CON TECLADO ──────── Flechas para moverte por el grid, Enter
                                 abre, Escape cierra en cascada.
🥇 LINKS COMPARTIBLES ────────── #/t/movie/tt0111161 abre directo la ficha.
🥇 MULTIVERSO DE SERVIDORES ──── 11 reproductores; marca tu preferido ★
                                 por título y se preselecciona la próxima vez.
```

## 🗺️ EL MAPA DEL MUNDO

```plaintext
        ┌────────────────────────── GlTV ──────────────────────────┐
        │                                                          │
   🎬 PELÍCULAS              📺 SERIES                ⛩️ ANIME      │
        │                        │                        │        │
        ▼                        ▼                        ▼        │
  addon TMDB (es-MX) ──── episodios con minia- ──── catálogo Vimeus │
  + Cinemeta fallback     turas y sinopsis          + géneros Kitsu │
        │                        │                        │        │
        └────────────┬───────────┴────────────┬───────────┘        │
                     ▼                        ▼                    │
             modal de fuentes          reproductor iframe          │
             (11 servidores)           fullscreen + tráilers       │
        └──────────────────────────────────────────────────────────┘
```

## 🎮 CÓMO EMPEZAR A JUGAR

> **Requisitos:** un navegador. Eso es todo. 🎉

```plaintext
# Nivel 1 — clonar
git clone <este-repo> && cd <este-repo>

# Nivel 2 — servir (cualquier servidor estático sirve)
python -m http.server 8080

# Nivel 3 — jugar
# abre http://localhost:8080  →  🍿
```

📱 **Nivel secreto: instalarla en el teléfono**  
 

1.  Abre la página en Chrome/Brave del teléfono (misma red o desplegada).
2.  Menú → **"Agregar a pantalla de inicio"** / **"Instalar app"**.
3.  GlTV queda instalada con su ícono, pantalla completa y sin barra del navegador. 🏅

⌨️ **Controles del jugador**  
 

| Tecla | Acción |
| --- | --- |
| `← → ↑ ↓` | Moverse por el grid |
| `Enter` | Abrir el título enfocado |
| `Escape` | Cerrar en cascada: reproductor → fuentes → detalle → búsqueda |
| `Atrás` (navegador) | Cierra la ficha (las fichas viven en la URL) |

**Hecho con ❤️, 🍿 y cero frameworks.**

_GlTV no aloja contenido. Todos los catálogos y reproductores son servicios públicos de terceros._

![insert coin](https://img.shields.io/badge/GAME%20OVER%3F-INSERT%20COIN%20%E2%96%B6%20REPRODUCIR-e50914?style=for-the-badge)