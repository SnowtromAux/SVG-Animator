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

### `app/Middlewares/requireAuth.php`
**Цел:** middleware за защитени endpoint-и.

- стартира session
- проверява `$_SESSION["user"]`
- ако няма user → `Response::error("UNAUTHORIZED", "Не сте логнати.", 401)`

Използване: в началото на route файл.
```php
require_once __DIR__ . "/../../app/Core/Session.php";
require_once __DIR__ . "/../../app/Core/Response.php";
require_once __DIR__ . "/../../app/Middlewares/requireAuth.php";

requireAuth();


app/Models/RequestMethod.php
Enum за позволените HTTP методи:
GET, POST, PUT, DELETE
Използва се в index.php, за да се режат непозволени методи с 405.


app/Repositories/UserRepositories.php (UserRepository)
Цел: всички DB операции, свързани с user.
Методи:
findByEmailOrUsername(mysqli $db, string $email, string $username): ?array
SELECT id, email, username, password от таблица user
create(mysqli $db, string $username, string $email, string $password): int
INSERT в user, връща insert_id
Забележка: използва mysqli_prepare и bind параметри → безопасно срещу SQL injection.


app/Controllers/Auth.controller.php (AuthController)
Цел: auth операции.
Методи:
register()
чете JSON: email, username, password
валидира с Validator
проверява дали user съществува (UserRepository::findByEmailOrUsername)
създава user (UserRepository::create) със hashed password
връща 201 при успех
login()
чете JSON: login (email или username) и password
намира user (по email/username)
проверява паролата (PasswordHasher::verify)
Session::login(...)
logout()
Session::logout()
me()
връща $_SESSION["user"]
(на практика този endpoint трябва да е защитен с requireAuth() в route файла)


Endpoints и routing
Router-ът работи по файловата система:
GET/POST ... /<BASE_PATH>/auth/login → routes/auth/login.php
... /<BASE_PATH>/auth/register → routes/auth/register.php
... /<BASE_PATH>/auth/logout → routes/auth/logout.php
... /<BASE_PATH>/auth/me → routes/auth/me.php

Важно: Router-ът сам по себе си не рутира по HTTP method. Един route файл отговаря за конкретния path; вътре в него вие решавате дали приемате GET/POST и т.н.


Как се добавя нов endpoint
1) Създай route файл в routes/

Пример: искаме endpoint:
/api/profile/update

Създаваме:
routes/profile/update.php

2) В route файла: включи нужните зависимости и извикай handler

Примерен skeleton:

<?php

require_once __DIR__ . "/../../app/Core/Request.php";
require_once __DIR__ . "/../../app/Core/Response.php";
require_once __DIR__ . "/../../app/Models/RequestMethod.php";

// (по желание) middleware
require_once __DIR__ . "/../../app/Core/Session.php";
require_once __DIR__ . "/../../app/Middlewares/requireAuth.php";

requireAuth();

// разреши само PUT
if ($_SERVER["REQUEST_METHOD"] !== RequestMethod::PUT->value) {
    Response::error("METHOD_NOT_ALLOWED", "Only PUT is allowed.", 405);
}

// Тук: или директна логика, или Controller
// ProfileController::update();
Response::success(["message" => "OK"]);

3) Готово

Няма нужда от регистрация в централен файл. Самото наличие на файла определя endpoint-а.


Как се добавя нов тип заявка
В момента позволените методи се валидират още в index.php чрез:
RequestMethod::tryFrom($_SERVER['REQUEST_METHOD'])


За да добавиш нов HTTP method (напр. PATCH):

Добави case в app/Models/RequestMethod.php:

case PATCH = 'PATCH';


Увери се, че web server / proxy допуска PATCH (ако имаш такива ограничения).
В съответните route файлове добави проверка за PATCH, ако държиш на ограничението по метод.
Ако не добавиш case в enum-а, index.php ще върне 405 за този метод, преди изобщо да стигнеш до route.


База данни
Конфигурация през .env
MySQLClient чете от $_ENV:
DB_SERVER
DB_USER
DB_PASSWORD
DB_NAME
index.php зарежда .env така:

EnvLoader::load(__DIR__ . '/.env');


Как се използва базата в code

Стандартният шаблон (използван в AuthController) е:

$db = MySQLClient::getInstance();
$db->connect();
$conn = $db->getConnection();


След това mysqli $conn се подава на repository методи:
$user = UserRepository::findByEmailOrUsername($conn, $email, $username);
Препоръчан подход
Дръж SQL логиката в Repositories/.
В Controllers/ само orchestrate-вай: validate → repository → response.
Ползвай prepared statements (както е в UserRepository) за сигурност.


Auth и сесии
Session model

След login, Session::login() записва:

$_SESSION["user"] = [
  "id" => ...,
  "username" => ...,
  "email" => ...
];


Защитени endpoint-и
За endpoint-и, които изискват логнат потребител:
В route файла извикай requireAuth() преди да върнеш каквото и да е.
Пример за routes/auth/me.php (идея):

<?php
require_once __DIR__ . "/../../app/Core/Session.php";
require_once __DIR__ . "/../../app/Core/Response.php";
require_once __DIR__ . "/../../app/Middlewares/requireAuth.php";
require_once __DIR__ . "/../../app/Controllers/Auth.controller.php";

requireAuth();
AuthController::me();


CORS

В index.php се include-ва:
require_once __DIR__ . "/config/cors.php";
Това означава, че CORS header-ите се прилагат глобално за всички заявки още на entrypoint ниво.

Самият cors.php не е предоставен в качените файлове, но логиката му типично включва Access-Control-Allow-Origin, Allow-Methods, Allow-Headers и обработка на OPTIONS.