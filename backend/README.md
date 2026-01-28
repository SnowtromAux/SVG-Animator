# PHP REST API Backend (Simple Router + Controllers + Repositories)

Този проект е минималистичен PHP REST API backend, базиран на:
- **file-based routing** (всяка `.php` файл в `routes/` е endpoint),
- **Controller-и** за бизнес логика,
- **Repository слой** за работа с базата,
- **JSON Request/Response helper-и**,
- **Session-based auth** (login/logout + middleware за защитени routes),
- **.env конфигурация** (EnvLoader).

> `index.php` е root entrypoint-а на проекта.

---

## Съдържание
- [Архитектура и структура](#архитектура-и-структура)
- [Поток на заявките](#поток-на-заявките)
- [Класове и файлове](#класове-и-файлове)
- [Endpoints и routing](#endpoints-и-routing)
- [Как се добавя нов endpoint](#как-се-добавя-нов-endpoint)
- [Как се добавя нов тип заявка](#как-се-добавя-нов-тип-заявка)
- [База данни](#база-данни)
- [Auth и сесии](#auth-и-сесии)
- [CORS](#cors)

---

## Архитектура и структура

По снимката и наличните файлове структурата изглежда така:

backend/
    index.php

app/
    Controllers/
        Auth.controller.php

Core/
    Database.php
    Request.php
    Response.php
    Router.php
    Session.php

Helpers/
    EnvLoader.php
    PasswordHasher.php
    Validator.php

Middlewares/
    requireAuth.php

Models/
    RequestMethod.php

Repositories/
    UserRepositories.php

Services/
    empty for now

config/
    cors.php

database/
    migrations/
    seeders/

routes/
    auth/
        login.php
        logout.php
        me.php
        register.php



**Идея на структурата:**
- `index.php` – entrypoint, bootstrap-ва средата, CORS, core класове и пуска Router-а.
- `routes/` – реалните endpoint-и като файлове (file-based routing).
- `Controllers/` – HTTP handlers (логика по операции).
- `Repositories/` – комуникация с базата (SQL, prepared statements).
- `Core/` – инфраструктура: Request, Response, Router, Session, Database.
- `Helpers/` – utility класове (валидация, хеширане, .env loader).
- `Middlewares/` – защити/проверки, които се викат в началото на route файлове.

---

## Поток на заявките

1. **HTTP заявка** към `index.php` (или към публичния root, който сочи към него).
2. `index.php`:
   - зарежда `.env` чрез `EnvLoader::load()`
   - include-ва core класовете
   - include-ва `config/cors.php`
   - валидира HTTP метода чрез `RequestMethod::tryFrom($_SERVER['REQUEST_METHOD'])`
   - създава `Router('routes/', $base_path)` и вика `$router->dispatch()`
3. `Router::dispatch()`:
   - взима `REQUEST_URI`
   - маха `BASE_PATH`
   - конвертира URL пътя към файл: `routes/<route>.php`
   - `require`-ва route файла, ако съществува; иначе връща 404
4. Route файлът (напр. `routes/auth/login.php`):
   - обикновено:
     - проверява request method (ако е имплементирано на ниво route)
     - включва нужните controller-и/middleware-и
     - вика конкретен controller метод (напр. `AuthController::login()`)
5. Controller методът:
   - чете JSON (`Request::json()`)
   - валидира (`Validator`)
   - работи с DB чрез `MySQLClient` и `UserRepository`
   - връща JSON отговор чрез `Response::success()` или `Response::error()`

---

## Класове и файлове

### `index.php` (Entrypoint)
**Отговорности:**
- Зарежда env променливи (`.env`) чрез `EnvLoader`.
- Зарежда core класовете (Request/Response/Database/Session/Router).
- Зарежда CORS конфигурация (`config/cors.php`).
- Валидира дали HTTP методът е позволен чрез enum `RequestMethod`.
- Стартира routing-а.

Ключов момент:
- Ако методът **не е** в `RequestMethod`, връща:
  - `405 METHOD_NOT_ALLOWED` чрез `Response::error(...)`.

---

### `app/Core/Router.php`
**Какво прави:**
- Map-ва URL път към `.php` файл в `routes/`.
- Поддържа `BASE_PATH` (от `.env`) за случаи, когато проектът не е на домейн root.

**Алгоритъм:**
- `/BASE_PATH/auth/login` → `routes/auth/login.php`

**Защита:**
- Валидира route-а да съдържа само `[a-zA-Z0-9_\-\/]`, иначе връща `INVALID_ROUTE`.

---

### `app/Core/Request.php`
**Цел:** удобен достъп до входни данни.

Методи:
- `Request::json(): array`
  - чете body (`php://input`), decode-ва JSON
  - ако не е валиден JSON → `Response::error("INVALID_JSON", ...)` (400)
- `Request::param(string $key, $default = null)`
  - връща `$_GET[$key]` (query params)
- `Request::params(): array`
  - връща всички `$_GET` параметри

---

### `app/Core/Response.php`
**Цел:** стандартни JSON отговори.

Методи:
- `Response::json(array $data, int $status = 200)`
  - задава HTTP status + `Content-Type: application/json`
  - `echo` JSON и `exit`
- `Response::success(array $data = [], int $status = 200)`
  - връща `{"success": true, ...}`
- `Response::error(string $code, string $message, int $status = 400, array $extra = [])`
  - връща:
    ```json
    {
      "success": false,
      "error": { "code": "...", "message": "...", ... }
    }
    ```

---

### `app/Core/Session.php`
**Цел:** session management за auth.

Методи:
- `Session::start()`
  - пуска PHP session (ако не е стартирана)
  - задава cookie параметри (httponly, samesite, etc.)
- `Session::login($userId, $username, $email)`
  - `session_regenerate_id(true)`
  - записва `$_SESSION["user"] = [...]`
- `Session::user(): ?array`
  - връща текущия user или null
- `Session::logout()`
  - чисти `$_SESSION`, cookie и `session_destroy()`

---

### `app/Core/Database.php` (`MySQLClient`)
**Цел:** една-единствена DB връзка (Singleton).

Ключови неща:
- `MySQLClient::getInstance()` чете:
  - `DB_SERVER`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` от `$_ENV`
- `connect()` създава `mysqli_connect(...)` само ако няма връзка.
- `getConnection()` връща mysqli connection или хвърля exception ако не е `connect()`-нато.

---

### `app/Helpers/EnvLoader.php`
**Цел:** зарежда `.env` файл в `$_ENV` и `putenv()`.

Особености:
- прескача празни редове и коментари (`# ...`)
- не презаписва ключ, ако вече съществува в `$_ENV`
- премахва кавички от стойностите

---

### `app/Helpers/Validator.php`
**Цел:** валидация на входни данни, хвърля `Exception` при проблем.

Методи:
- `email($email)` – `filter_var(..., FILTER_VALIDATE_EMAIL)`
- `username($username)` – regex: `^[A-Za-z0-9._-]{3,50}$`
- `password($password)` – минимум 6 символа

---

### `app/Helpers/PasswordHasher.php`
**Цел:** хеширане и проверка на пароли.

- `hash($password)` → `password_hash(..., PASSWORD_DEFAULT)`
- `verify($password, $hash)` → `password_verify(...)`

---

## Middlewares

### `app/Middlewares/requireAuth.php`
**Цел:** middleware за защитени endpoint-и.

- стартира session
- проверява `$_SESSION["user"]`
- ако няма user → `Response::error("UNAUTHORIZED", "Не сте логнати.", 401)`

**Използване:** в началото на route файл.

```php
require_once __DIR__ . "/../../app/Core/Session.php";
require_once __DIR__ . "/../../app/Core/Response.php";
require_once __DIR__ . "/../../app/Middlewares/requireAuth.php";

requireAuth();
```

---

## Models

### `app/Models/RequestMethod.php`
Enum за позволените HTTP методи:
- GET
- POST
- PUT
- DELETE

**Използване:**
- използва се в `index.php`
- валидира HTTP метода
- при непозволен метод връща `405 METHOD_NOT_ALLOWED`

---

## Repositories

### `app/Repositories/UserRepositories.php` (`UserRepository`)
**Цел:** всички DB операции, свързани с user.

**Методи:**
- `findByEmailOrUsername(mysqli $db, string $email, string $username): ?array`  
  SELECT id, email, username, password FROM user
- `create(mysqli $db, string $username, string $email, string $password): int`  
  INSERT INTO user, връща insert_id

**Забележка:**
- използва `mysqli_prepare` и `bind_param`
- защита срещу SQL injection

---

## Controllers

### `app/Controllers/Auth.controller.php` (`AuthController`)
**Цел:** auth операции.

#### `register()`
- чете JSON: email, username, password
- валидира чрез Validator
- проверява дали user съществува
- създава user със hashed password
- връща `201 CREATED`

#### `login()`
- чете JSON: login (email или username) и password
- намира user
- проверява паролата (`PasswordHasher::verify`)
- `Session::login()`

#### `logout()`
- `Session::logout()`

#### `me()`
- връща `$_SESSION["user"]`
- endpoint-ът трябва да е защитен с `requireAuth()`

---

## Endpoints и routing

Router-ът работи file-based.

Примери:
- `/auth/login` → `routes/auth/login.php`
- `/auth/register` → `routes/auth/register.php`
- `/auth/logout` → `routes/auth/logout.php`
- `/auth/me` → `routes/auth/me.php`

**Важно:**
- Router-ът НЕ рутира по HTTP method
- всеки route файл сам проверява метода

---

## Как се добавя нов endpoint

### 1) Създай route файл

Endpoint:
`/api/profile/update`

Файл:
`routes/profile/update.php`

---

### 2) Route skeleton

```php
<?php

require_once __DIR__ . "/../../app/Core/Request.php";
require_once __DIR__ . "/../../app/Core/Response.php";
require_once __DIR__ . "/../../app/Models/RequestMethod.php";

require_once __DIR__ . "/../../app/Core/Session.php";
require_once __DIR__ . "/../../app/Middlewares/requireAuth.php";

requireAuth();

if ($_SERVER["REQUEST_METHOD"] !== RequestMethod::PUT->value) {
    Response::error("METHOD_NOT_ALLOWED", "Only PUT is allowed.", 405);
}

Response::success(["message" => "OK"]);
```

---

### 3) Готово
Няма централна регистрация.  
Файлът = endpoint.

---

## Как се добавя нов HTTP метод

В `index.php`:
`RequestMethod::tryFrom($_SERVER['REQUEST_METHOD'])`

### Пример: PATCH

В `app/Models/RequestMethod.php`:
```php
case PATCH = 'PATCH';
```

Ако няма case → `405` още в `index.php`.

---

## База данни

### Конфигурация (.env)
- DB_SERVER
- DB_USER
- DB_PASSWORD
- DB_NAME

Зареждане:
```php
EnvLoader::load(__DIR__ . '/.env');
```

---

### Използване

```php
$db = MySQLClient::getInstance();
$db->connect();
$conn = $db->getConnection();
```

```php
$user = UserRepository::findByEmailOrUsername($conn, $email, $username);
```

**Препоръки:**
- SQL само в Repositories
- Controllers orchestrate-ват
- prepared statements

---

## Auth и сесии

След login:
```php
$_SESSION["user"] = [
  "id" => ...,
  "username" => ...,
  "email" => ...
];
```

---

## Защитени endpoint-и

Извиквай `requireAuth()` в началото.

Пример `routes/auth/me.php`:
```php
<?php
require_once __DIR__ . "/../../app/Core/Session.php";
require_once __DIR__ . "/../../app/Core/Response.php";
require_once __DIR__ . "/../../app/Middlewares/requireAuth.php";
require_once __DIR__ . "/../../app/Controllers/Auth.controller.php";

requireAuth();
AuthController::me();
```

---

## CORS

В `index.php`:
```php
require_once __DIR__ . "/config/cors.php";
```

CORS header-ите се прилагат глобално и обработват OPTIONS заявки.
