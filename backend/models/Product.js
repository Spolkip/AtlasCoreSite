// backend/models/Product.js
const { FIREBASE_DB } = require('../config/firebase');
const { collection, doc, getDoc, updateDoc, deleteDoc, addDoc, getDocs, query, where, orderBy } = require('firebase/firestore');

const productsCollection = collection(FIREBASE_DB, 'products');

class Product {
  constructor(data) {
    this.id = data.id || null;
    this.name = data.name;
    this.description = data.description || null;
    this.price = data.price;
    this.discountPrice = data.discountPrice === undefined ? null : data.discountPrice;
    // Set stock to null if it's undefined, null, or an empty string, to represent infinite.
    this.stock = (data.stock === undefined || data.stock === null || data.stock === '') ? null : Number(data.stock);
    this.category = data.category || null;
    this.imageUrl = data.imageUrl || null;
    // Changed to an array to support multiple commands.
    this.in_game_commands = Array.isArray(data.in_game_commands) ? data.in_game_commands : []; 
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async save() {
    const productData = {
      name: this.name,
      description: this.description,
      price: this.price,
      discountPrice: this.discountPrice,
      // Ensure stock is saved as null for infinite, or a number.
      stock: this.stock, 
      category: this.category,
      imageUrl: this.imageUrl,
      // Save the array of commands.
      in_game_commands: this.in_game_commands,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    };
    if (this.id) {
      await updateDoc(doc(productsCollection, this.id), productData);
    } else {
      const newProductRef = await addDoc(productsCollection, productData);
      this.id = newProductRef.id;
    }
    return this;
  }

  async update(fieldsToUpdate) {
    if (!this.id) throw new Error("Cannot update a product without an ID.");
    const updatedData = { ...fieldsToUpdate, updatedAt: new Date() };
    // Ensure stock is correctly handled when updating
    if (updatedData.stock === '') { // If stock is explicitly set to empty string, treat as infinite
        updatedData.stock = null;
    } else if (updatedData.stock !== undefined && updatedData.stock !== null) {
        updatedData.stock = Number(updatedData.stock);
    }

    if (updatedData.discountPrice === '' || updatedData.discountPrice === undefined) {
        updatedData.discountPrice = null;
    } else if (updatedData.discountPrice !== null) {
        updatedData.discountPrice = Number(updatedData.discountPrice);
    }


    await updateDoc(doc(productsCollection, this.id), updatedData);
    Object.assign(this, updatedData);
    return this;
  }
}

// Static Methods
Product.findById = async function(id) {
  const productDocSnap = await getDoc(doc(productsCollection, id));
  // Ensure stock is correctly interpreted when fetched
  const data = productDocSnap.exists() ? productDocSnap.data() : null;
  if (data) {
    data.stock = (data.stock === undefined || data.stock === null) ? null : Number(data.stock);
    return new Product({ id: productDocSnap.id, ...data });
  }
  return null;
};

// findAllFiltered method to apply filters and sorting
Product.findAllFiltered = async function(filters = {}) {
  let productsQuery = productsCollection;

  // Firestore limitations: Cannot use range filters (minPrice, maxPrice) and equality filters (inStockOnly)
  // on different fields in the same query without a composite index.
  // To keep it flexible without requiring specific composite indexes for every combination,
  // we will fetch all products and apply numerical/text filters and sorting client-side.
  // For 'inStockOnly', we'll apply it after fetching.

  const querySnapshot = await getDocs(productsQuery); // Fetch all products first
  let filteredProducts = querySnapshot.docs.map(doc => {
    const data = doc.data();
    data.stock = (data.stock === undefined || data.stock === null) ? null : Number(data.stock);
    return new Product({ id: doc.id, ...data });
  });

  // Apply filters client-side
  if (filters.searchTerm) {
    const lowerCaseSearchTerm = filters.searchTerm.toLowerCase();
    filteredProducts = filteredProducts.filter(product => {
      // Safely access name and description, converting to empty string if null/undefined
      const name = product.name ? String(product.name).toLowerCase() : '';
      const description = product.description ? String(product.description).toLowerCase() : '';
      return name.includes(lowerCaseSearchTerm) || description.includes(lowerCaseSearchTerm);
    });
  }

  if (filters.minPrice !== null) {
    filteredProducts = filteredProducts.filter(product => product.price >= filters.minPrice);
  }
  if (filters.maxPrice !== null) {
    filteredProducts = filteredProducts.filter(product => product.price <= filters.maxPrice);
  }
  if (filters.inStockOnly) {
    // Include products with stock > 0 OR stock is null (representing infinite stock)
    filteredProducts = filteredProducts.filter(product => product.stock === null || product.stock > 0);
  }

  // Apply sorting client-side
  if (filters.sortBy) {
    filteredProducts.sort((a, b) => {
      switch (filters.sortBy) {
        case 'priceAsc':
          return a.price - b.price;
        case 'priceDesc':
          return b.price - a.price;
        case 'nameAsc':
          // Safely compare names
          const nameA = a.name ? String(a.name).toLowerCase() : '';
          const nameB = b.name ? String(b.name).toLowerCase() : '';
          return nameA.localeCompare(nameB);
        case 'nameDesc':
          // Safely compare names
          const nameADesc = a.name ? String(a.name).toLowerCase() : '';
          const nameBDesc = b.name ? String(b.name).toLowerCase() : '';
          return nameBDesc.localeCompare(nameADesc);
        default:
          return 0;
      }
    });
  }

  return filteredProducts;
};


Product.findAll = async function() {
  const querySnapshot = await getDocs(productsCollection);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    // Ensure stock is correctly interpreted when fetched for all products
    data.stock = (data.stock === undefined || data.stock === null) ? null : Number(data.stock);
    return new Product({ id: doc.id, ...data });
  });
};

Product.delete = async function(id) {
  await deleteDoc(doc(productsCollection, id));
  return true;
};

module.exports = Product;
