# Frontend (/frontend)

Frontend частта на проекта е написана на **vanilla JavaScript + HTML + CSS** (без framework). Организиран е като статичен сайт с “views” (страници), общи компоненти и services слой за комуникация с бекенда.

---

## Структура на проекта

```
frontend/
├─ .htaccess
├─ globals.css
├─ index.html
└─ src/
   ├─ assets/
   │  ├─ images/
   │  └─ sounds/
   ├─ components/
   │  ├─ navbar/
   │  └─ footer/
   ├─ constants/
   │  ├─ animation-properties.js
   │  ├─ default-settings.js
   │  └─ env.js
   ├─ services/
   │  ├─ animations.js
   │  └─ auth.js
   ├─ utils/
   │  ├─ auth-guard.js
   │  └─ svg-animatable.js
   └─ views/
      ├─ login/
      ├─ register/
      └─ platform/
         ├─ editor/
         ├─ my-posts/
         ├─ my-projects/
         └─ posts/
```

---

## .htaccess (routing / clean URLs)

В `/frontend/.htaccess` са настроени правила, които:

- Позволяват **serving на файлове без `.html`** в URL-а (напр. `/login` вместо `/login.html`).
- Правят **`index.html` еквивалентно на `/`**.
- “Почистват” root-а на приложението, като премахват нуждата от `/src/views` в пътищата (т.е. страниците са достъпни директно като `/login`, `/platform/editor`, и т.н.).

> Това позволява UX като при SPA/modern routing, но без framework.

---

## globals.css

`/frontend/globals.css` съдържа **глобалните цветове, типография и общи стилове**, които се използват в страниците на приложението.

---

## Entry point: index.html

`/frontend/index.html` е entry point за проекта и служи като стартова точка, която **пренасочва към**:

- `/login`

---

## /src директория

### 1) Assets

- `/src/assets/images` – изображения
- `/src/assets/sounds` – звуци

### 2) Components

`/src/components` съдържа общи компоненти за структурата на страниците:

- Навбар
- Футър

### 3) Constants

`/src/constants` съдържа константи и настройки:

- `animation-properties.js` – properties за анимации
- `default-settings.js` – default настройки за анимации
- `env.js` – конфигурация за връзка с бекенда:
  - `API_BASE_URL` (base URL към backend API)

### 4) Services (API слой)

`/src/services` е слой за комуникация с бекенда чрез HTTP заявки.

#### animations.js

Отговаря за заявки към endpoints за анимации:

- `GET /animation/get-animation?animation_id=...`
- `POST /animation/create-animation`
- `PUT /animation/save-animation`
- `GET /animation/get-all-animations?page=...&search_text=...`
- `DELETE /animation/delete-animation`

Има helper `safeJsonFetch()`, който:
- прави `fetch`
- се опитва да парсне JSON
- връща стандартизиран резултат `{ success: true, data }` или `{ success: false, error }`
- обработва network error и non-JSON responses

#### auth.js

Отговаря за authentication endpoints:

- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/me`
- `GET /auth/logout`

Всяка функция връща обект в стил:
- `{ success: true, data | message }`  
или
- `{ success: false, error: { code, message } }`

### 5) Utils

`/src/utils` съдържа помощни функции, използвани в компонентите:

- `auth-guard.js` – защита на routes/страници:
  - проверява дали има логнат потребител чрез request към `/auth/me`
  - ако няма, пренасочва към login (или блокира достъп)
- `svg-animatable.js` – helper функции за анимиране на SVG елементи

### 6) Views (страници)

`/src/views` съдържа страниците на приложението. За всяка страница има стандартен набор:

- `index.html`
- `index.js`
- `styles.css`

Налични views:

- `/login`
- `/register`
- `/platform/editor`
- `/platform/my-posts`
- `/platform/my-projects`
- `/platform/posts`

---

## Как се добавя нова страница (view)

1. Създай папка в `/src/views/<route>`
2. Добави:
   - `index.html`
   - `index.js`
   - `styles.css`
3. Увери се, че `.htaccess` ще позволява достъп до route-а без `.html`.

---

## Backend връзка (ENV)

В `/src/constants/env.js` се дефинира:

- `API_BASE_URL` – base URL до бекенда

Всички services използват `API_BASE_URL`, напр.:

- `${API_BASE_URL}/auth/login`
- `${API_BASE_URL}/animation/get-all-animations`

---

## Забележки

- Проектът не използва build tool / bundler по подразбиране (vanilla структура).
- Routing разчита на `.htaccess` правила за clean URLs.
- Services връщат унифициран формат, което улеснява error handling-а във views/components.
