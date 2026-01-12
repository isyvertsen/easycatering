const fs = require('fs');
const path = require('path');

// List of API files to fix
const apiFiles = [
  'src/lib/api/employees.ts',
  'src/lib/api/customers.ts',
  'src/lib/api/orders.ts',
  'src/lib/api/products.ts',
  'src/lib/api/menus.ts',
  'src/lib/api/kundegruppe.ts'
];

apiFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace /api/v1/ with /v1/ in all API calls
    content = content.replace(/['"]\/api\/v1\//g, '"/v1/');
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed: ${file}`);
  } else {
    console.log(`❌ File not found: ${file}`);
  }
});

console.log('\nAll API endpoints have been fixed!');