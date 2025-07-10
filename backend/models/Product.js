// backend/models/Product.js
const { FIREBASE_DB } = require('../config/firebase');
const { collection, doc, getDoc, updateDoc, deleteDoc, addDoc, getDocs, query, where } = require('firebase/firestore');

const productsCollection = collection(FIREBASE_DB, 'products');

class Product {
  constructor(data) {
    this.id = data.id || null;
    this.name = data.name;
    this.description = data.description || null;
    this.price = data.price;
    this.stock = data.stock !== undefined ? data.stock : null;
    this.category = data.category || null;
    this.imageUrl = data.imageUrl || null;
    // UPDATED: Changed to an array to support multiple commands.
    this.in_game_commands = Array.isArray(data.in_game_commands) ? data.in_game_commands : []; 
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async save() {
    const productData = {
      name: this.name,
      description: this.description,
      price: this.price,
      stock: this.stock,
      category: this.category,
      imageUrl: this.imageUrl,
      // UPDATED: Save the array of commands.
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
    await updateDoc(doc(productsCollection, this.id), updatedData);
    Object.assign(this, updatedData);
    return this;
  }
}

// Static Methods
Product.findById = async function(id) {
  const productDocSnap = await getDoc(doc(productsCollection, id));
  return productDocSnap.exists() ? new Product({ id: productDocSnap.id, ...productDocSnap.data() }) : null;
};

Product.findAll = async function() {
  const querySnapshot = await getDocs(productsCollection);
  return querySnapshot.docs.map(doc => new Product({ id: doc.id, ...doc.data() }));
};

Product.delete = async function(id) {
  await deleteDoc(doc(productsCollection, id));
  return true;
};

module.exports = Product;