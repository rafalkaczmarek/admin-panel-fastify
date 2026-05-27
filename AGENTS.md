## Prisma / PostgreSQL naming conventions

Poniższe reguły obowiązują dla nazw obiektów w Postgresie generowanych przez Prisma (tabele, kolumny, indeksy, constrainty). Prisma-model/field może pozostać w `PascalCase` / `camelCase`, ale **w bazie** używamy mapowań `@@map` i `@map`, aby trzymać konsekwentne nazewnictwo.

### Tables

- **Table names**: zawsze **liczba mnoga** + **snake_case** (np. `users`, `refresh_tokens`, `order_items`).
- **Prisma**: każdy `model` musi mieć `@@map("<plural_snake_case>")`.

### Columns

- **Column names**: zawsze **snake_case** (np. `created_at`, `password_hash`, `available_colors`).
- **Prisma**: każdy field, który nie jest już `snake_case`, mapujemy `@map("<snake_case>")`.

### Primary keys

- **Primary key column**: `<entity>_id` w `snake_case` (np. `user_id`, `product_id`, `refresh_token_id`).
- **Constraint name**: `<table>_pkey` (domyślne w Postgresie; trzymamy spójność).

### Foreign keys

- **FK column**: `<referenced_entity>_id` (np. `user_id` w `refresh_tokens`).
- **Constraint name**: `<table>_<column>_fkey` (standard Postgresa; nie wymuszamy ręcznie, ale nie nadpisujemy na inne).

### Unique constraints (alternate keys)

- **Unique constraint name**: `<table>_<column>_key` (np. `users_email_key`, `refresh_tokens_token_hash_key`).
- **Prisma**: używamy `@unique(map: "...")` albo `@@unique(..., map: "...")`.

### Indexes

- **Index name**: `idx_<table>_<column>` (np. `idx_products_category`, `idx_refresh_tokens_user_id`).
- **Prisma**: używamy `@@index(..., map: "idx_<table>_<column>")`.

### General

- **Separators**: tylko `_` (snake_case); brak camelCase i PascalCase w nazwach DB.
- **Case**: małe litery.
- **Consistency**: jeśli dotykasz modelu/tabeli, doprowadź ją do pełnej zgodności z powyższymi regułami.

