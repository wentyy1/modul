# ADR 0003 — API Style and Error Model

## Context
Проєкт Peripheral Shop надає HTTP API для роботи з товарами.
Потрібно уніфікувати стиль API та формат обробки помилок.

## Decision

### API Style
- API реалізовано у стилі **REST**.
- Формат обміну даними: **JSON**.
- Усі ендпоїнти повинні відповідати контракту **OpenAPI**.

### HTTP Status Policy
| Ситуація | Статус |
|---------|--------|
Успішне створення | 201 |
Успішне отримання | 200 |
Успішне видалення | 204 |
Помилка валідації | 400 |
Ресурс не знайдено | 404 |
Внутрішня помилка | 500 |

### Error Model
Використовується **єдиний формат помилки**:

```json
{
  "error": "ValidationError",
  "code": "NAME_REQUIRED",
  "details": [
    { "field": "name", "message": "Name is required" }
  ]
}
