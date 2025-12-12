# ThamesApp API Documentation

**Base URL:** `http://13.48.13.62:3001`

## 1. Authentication

### Login
- **Endpoint:** `POST /api/auth/login`
- **Description:** Authenticates a user and returns a JWT token.
- **Body:**
  ```json
  {
    "username": "customer@example.com",
    "password": "password123",
    "role": "customer" // Options: 'customer', 'sales_rep', 'admin'
  }
  ```
- **Response:** Returns a JSON object containing the `token` and `user` details.

## 2. Products

### Get All Products
- **Endpoint:** `GET /api/products`
- **Description:** Returns a list of all products, including pricing tiers and barcodes.

### Get Single Product
- **Endpoint:** `GET /api/products/:id`
- **Description:** Returns details for a specific product ID.

### Get Product by Barcode
- **Endpoint:** `GET /api/products/by-barcode/:barcode`
- **Description:** Finds a product by scanning an EAN barcode.

## 3. Categories & Brands

### Get Main Categories
- **Endpoint:** `GET /api/categories`

### Get Sub-Categories
- **Endpoint:** `GET /api/categories/sub`

### Get Brands
- **Endpoint:** `GET /api/brands`

## 4. Orders
**Note:** These endpoints require the `Authorization` header:
`Authorization: Bearer <your_token_here>`

### Get My Orders
- **Endpoint:** `GET /api/orders`
- **Description:** Returns a list of past orders for the authenticated user.

### Get Order Details
- **Endpoint:** `GET /api/orders/:orderId`
- **Description:** Returns items and details for a specific order.

### Place Order
- **Endpoint:** `POST /api/orders`
- **Body:**
  ```json
  {
    "total_amount": 150.50,
    "items": [
      {
        "product_id": 101,
        "tier": 1,
        "quantity": 10,
        "price": 15.05
      }
    ]
  }
  ```

## 5. System

### Health Check
- **Endpoint:** `GET /`
- **Description:** Returns "API is running..." to verify server status.
