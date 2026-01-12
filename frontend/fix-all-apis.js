const fs = require('fs');
const path = require('path');

function fixApiFile(filePath, entityName, endpoint) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix all variations of the API calls
  content = content
    // Fix list endpoint
    .replace(/apiClient\.get\(['"`][^'"`]*\/v1\/[^'"`]*['"`]/, `apiClient.get('/v1/${endpoint}/'`)
    // Fix get by id
    .replace(/apiClient\.get\(`[^`]*\/v1\/[^`]*\/\$\{id\}`/, `apiClient.get(\`/v1/${endpoint}/\${id}\``)
    // Fix create
    .replace(/apiClient\.post\(['"`][^'"`]*\/v1\/[^'"`]*['"`]/, `apiClient.post('/v1/${endpoint}/'`)
    // Fix update
    .replace(/apiClient\.put\(`[^`]*\/v1\/[^`]*\/\$\{id\}`/, `apiClient.put(\`/v1/${endpoint}/\${id}\``)
    // Fix delete
    .replace(/apiClient\.delete\(`[^`]*\/v1\/[^`]*\/\$\{id\}`/, `apiClient.delete(\`/v1/${endpoint}/\${id}\``);
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed: ${entityName}`);
}

// Fix each API file
const apiFiles = [
  { path: 'src/lib/api/employees.ts', name: 'Employees', endpoint: 'ansatte' },
  { path: 'src/lib/api/customers.ts', name: 'Customers', endpoint: 'kunder' },
  { path: 'src/lib/api/orders.ts', name: 'Orders', endpoint: 'ordrer' },
  { path: 'src/lib/api/products.ts', name: 'Products', endpoint: 'produkter' },
  { path: 'src/lib/api/menus.ts', name: 'Menus', endpoint: 'meny' },
  { path: 'src/lib/api/kundegruppe.ts', name: 'Kundegruppe', endpoint: 'kundegruppe' }
];

apiFiles.forEach(file => {
  const fullPath = path.join(__dirname, file.path);
  fixApiFile(fullPath, file.name, file.endpoint);
});

console.log('\n✨ All API endpoints have been fixed!');