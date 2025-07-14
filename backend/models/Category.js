// backend/models/Category.js
const { FIREBASE_DB } = require('../config/firebase');
const { collection, doc, getDoc, updateDoc, deleteDoc, addDoc, getDocs, query, where } = require('firebase/firestore');

const categoriesCollection = collection(FIREBASE_DB, 'categories');

class Category {
  constructor(data) {
    this.id = data.id || null;
    this.name = data.name;
    this.description = data.description || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async save() {
    const categoryData = {
      name: this.name,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    };
    if (this.id) {
      await updateDoc(doc(categoriesCollection, this.id), categoryData);
    } else {
      const newCategoryRef = await addDoc(categoriesCollection, categoryData);
      this.id = newCategoryRef.id;
    }
    return this;
  }

  async update(fieldsToUpdate) {
    if (!this.id) throw new Error("Cannot update a category without an ID.");
    const updatedData = { ...fieldsToUpdate, updatedAt: new Date() };
    await updateDoc(doc(categoriesCollection, this.id), updatedData);
    Object.assign(this, updatedData);
    return this;
  }
}

// Static Methods
Category.findById = async function(id) {
  const categoryDocSnap = await getDoc(doc(categoriesCollection, id));
  return categoryDocSnap.exists() ? new Category({ id: categoryDocSnap.id, ...categoryDocSnap.data() }) : null;
};

Category.findByName = async function(name) {
  const q = query(categoriesCollection, where('name', '==', name));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  const categoryDoc = querySnapshot.docs[0];
  return new Category({ id: categoryDoc.id, ...categoryDoc.data() });
};

Category.findAll = async function() {
  const querySnapshot = await getDocs(categoriesCollection);
  return querySnapshot.docs.map(doc => new Category({ id: doc.id, ...doc.data() }));
};

Category.delete = async function(id) {
  await deleteDoc(doc(categoriesCollection, id));
  return true;
};

module.exports = Category;