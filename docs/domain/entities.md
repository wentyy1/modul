# Domain Entities — Peripheral Shop

## Піддомен: Catalog
- **Product**
  - id
  - name
  - type (keyboard / mouse)
  - brand
  - price
  - isAvailable

## Піддомен: Users
- **User**
  - id
  - username
  - role (User, Admin)

## Піддомен: Orders
- **Order**
  - id
  - userId
  - items: OrderItem[]
  - totalPrice
  - status

- **OrderItem**
  - productId
  - quantity
  - price
