# API Testing with HTTP Files

This directory contains HTTP files for testing the Catering System API endpoints. These files are compatible with:
- VS Code REST Client extension
- JetBrains HTTP Client (IntelliJ IDEA, WebStorm, etc.)
- Any tool that supports the standard `.http` file format

## Files Overview

### 🔐 auth.http
Basic authentication endpoints including:
- User registration
- Login (credentials & Google OAuth)
- Token refresh
- Protected endpoint testing

### 📊 crud.http
Generic CRUD operations for all tables:
- List tables and schemas
- Basic CRUD operations (Create, Read, Update, Delete)
- Pagination, sorting, and search examples
- Common table operations (employees, orders, recipes, etc.)

### 🔍 advanced-queries.http
Complex query examples:
- Relationship queries
- Multi-table lookups
- Advanced filtering and sorting
- Business-specific queries

### 📦 batch-operations.http
Complete workflow examples:
- Creating orders with details
- Recipe management with ingredients
- Weekly menu planning
- Inventory management
- Production planning

### 📈 reports.http
Reporting and analytics queries:
- Daily, weekly, and monthly reports
- Financial reports
- Quality control and compliance
- Staff and nutrition reports
- Sustainability metrics

### 🧪 test-scenarios.http
Real-world test scenarios:
- School lunch orders
- Elderly care special diets
- Event catering
- Emergency stock replenishment
- Menu approval workflow

## Usage

### VS Code (REST Client Extension)
1. Install the REST Client extension
2. Open any `.http` file
3. Click "Send Request" above each request
4. Results appear in a split pane

### JetBrains IDEs
1. Open any `.http` file
2. Click the green arrow next to each request
3. Results appear in the Run tool window

### Development Mode
When running with `AUTH_BYPASS=true` (development mode), authentication headers are optional. The requests will work without login.

### Production Mode
In production, you must:
1. First run the login request in `auth.http`
2. Copy the access token from the response
3. Add `Authorization: Bearer YOUR_TOKEN` header to protected endpoints

## Common Variables

All files use these common variables:
- `@baseUrl`: The API base URL (default: http://localhost:8000/api)
- `@contentType`: Request content type (default: application/json)
- `@accessToken`: JWT access token (obtained from login)

## Testing Workflow

1. **Start with auth.http**: Test authentication and get access tokens
2. **Explore with crud.http**: Understand table structures and basic operations
3. **Try batch-operations.http**: Test complete workflows
4. **Run test-scenarios.http**: Validate real-world use cases
5. **Generate reports.http**: Test reporting capabilities

## Tips

- Use `# @name variableName` to capture responses for use in subsequent requests
- Variables from named requests can be referenced as `{{variableName.response.body.field}}`
- Comments starting with `###` create visual separators
- Add `.env` file support for environment-specific variables

## Environment Variables

Create a `.env` file in this directory:
```env
baseUrl=http://localhost:8000/api
accessToken=your-dev-token-here
```

Then reference in `.http` files:
```http
GET {{$dotenv baseUrl}}/health/
Authorization: Bearer {{$dotenv accessToken}}
```