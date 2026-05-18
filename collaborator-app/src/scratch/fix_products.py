import os

filepath = r"c:\Users\ferna\Downloads\salon-suite-pro\collaborator-app\src\screens\ProductsCatalog.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace price.toString
content = content.replace("setProdPrice(selectedProduct.price.toString());", "setProdPrice(selectedProduct.price?.toString() || '');")
# Replace stock_quantity.toString
content = content.replace("setProdStock(selectedProduct.stock_quantity.toString());", "setProdStock(selectedProduct.stock_quantity?.toString() || '');")
# Replace newStock calculation
content = content.replace("const newStock = Math.max(0, product.stock_quantity + delta);", "const newStock = Math.max(0, (product.stock_quantity || 0) + delta);")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
