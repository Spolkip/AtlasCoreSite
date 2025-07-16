// backend/models/Product.js
const { FIREBASE_DB } = require('../config/firebase');
const { collection, doc, getDoc, updateDoc, deleteDoc, addDoc, getDocs, query, where, orderBy, startAt, endAt } = require('firebase/firestore');

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
  let clientSideSortNeeded = false; // Flag to indicate if client-side sorting is still required

  // Apply filters that can be done server-side
  // Firestore limitations:
  // - Cannot combine range filters (e.g., price >= X and price <= Y) with equality filters (e.g., stock == Z)
  //   on different fields in the same query without a composite index.
  // - Cannot do partial string matching (like SQL LIKE %term%) directly on the server.
  // - Only one orderBy clause per query.
  // - If a range filter is used, the first orderBy field must be the same as the range filter field.

  if (filters.minPrice !== null) {
    productsQuery = query(productsQuery, where('price', '>=', filters.minPrice));
  }
  if (filters.maxPrice !== null) {
    productsQuery = query(productsQuery, where('price', '<=', filters.maxPrice));
  }
  if (filters.inStockOnly) {
    // For 'inStockOnly', we filter where stock is greater than 0.
    // Products with `null` stock (representing infinite stock) will NOT be included by this Firestore query.
    // If you need to include products with `null` stock when `inStockOnly` is true,
    // you would need to either:
    // 1. Fetch all products and apply this filter client-side.
    // 2. Perform two separate Firestore queries (one for stock > 0, one for stock == null) and merge results.
    // For server-side efficiency with a single query, we assume inStockOnly refers to finite, positive stock.
    productsQuery = query(productsQuery, where('stock', '>', 0));
  }

  // Apply server-side sorting if compatible with existing filters
  let appliedServerSort = false;
  if (filters.sortBy) {
    const { minPrice, maxPrice } = filters;

    if (filters.sortBy.startsWith('price')) {
      // If price range filter is present, we can sort by price on the server
      if (minPrice !== null || maxPrice !== null) {
        productsQuery = query(productsQuery, orderBy('price', filters.sortBy === 'priceAsc' ? 'asc' : 'desc'));
        appliedServerSort = true;
      } else {
        // If no price range, we can still sort by price on the server
        productsQuery = query(productsQuery, orderBy('price', filters.sortBy === 'priceAsc' ? 'asc' : 'desc'));
        appliedServerSort = true;
      }
    } else if (filters.sortBy.startsWith('name')) {
      // If no price range filter is present, we can sort by name on the server
      // Note: For 'nameAsc' and 'nameDesc' to work efficiently with `startAt`/`endAt` for search,
      // you'd typically need to combine them, but that conflicts with range filters on other fields.
      if (minPrice === null && maxPrice === null) {
        productsQuery = query(productsQuery, orderBy('name', filters.sortBy === 'nameAsc' ? 'asc' : 'desc'));
        appliedServerSort = true;
      }
    }

    if (!appliedServerSort) {
      // If server-side sorting couldn't be fully applied due to Firestore limitations,
      // we'll need to sort client-side.
      clientSideSortNeeded = true;
    }
  }

  // Execute the Firestore query to get the initial set of filtered/sorted products
  const querySnapshot = await getDocs(productsQuery);
  let filteredProducts = querySnapshot.docs.map(doc => {
    const data = doc.data();
    data.stock = (data.stock === undefined || data.stock === null) ? null : Number(data.stock);
    return new Product({ id: doc.id, ...data });
  });

  // Apply filters that must be done client-side
  // (e.g., searchTerm as Firestore does not support partial string matching)
  if (filters.searchTerm) {
    const lowerCaseSearchTerm = filters.searchTerm.toLowerCase();
    filteredProducts = filteredProducts.filter(product => {
      // Safely access name and description, converting to empty string if null/undefined
      const name = product.name ? String(product.name).toLowerCase() : '';
      const description = product.description ? String(product.description).toLowerCase() : '';
      return name.includes(lowerCaseSearchTerm) || description.includes(lowerCaseSearchTerm);
    });
  }

  // Re-apply client-side sorting if needed
  // This is necessary if Firestore couldn't handle the requested sort (e.g., due to query limitations)
  // or if a client-side filter (like searchTerm) changed the order of an already sorted list.
  if (clientSideSortNeeded || (filters.sortBy && filters.sortBy.startsWith('name') && (filters.minPrice !== null || filters.maxPrice !== null))) {
    filteredProducts.sort((a, b) => {
      switch (filters.sortBy) {
        case 'priceAsc':
          return a.price - b.price;
        case 'priceDesc':
          return b.price - a.price;
        case 'nameAsc':
          const nameA = a.name ? String(a.name).toLowerCase() : '';
          const nameB = b.name ? String(b.name).toLowerCase() : '';
          return nameA.localeCompare(nameB);
        case 'nameDesc':
          const nameADesc = a.name ? String(a.name).toLowerCase() : '';
          const nameBDesc = b.name ? String(b.name).toLowerCase() : '';
          return nameBDesc.localeCompare(nameADesc);
        default:
          return 0; // No specific sort applied
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
