// backend/models/WikiCategory.js
const { FIREBASE_DB } = require('../config/firebase');
const { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc } = require('firebase/firestore');

const wikiCategoriesCollection = collection(FIREBASE_DB, 'wikicategories');

class WikiCategory {
  constructor(data) {
    this.id = data.id || null;
    this.name = data.name;
    this.description = data.description || null;
    this.parentId = data.parentId || null;
    this.content = data.content || ''; // Add content field
  }

  async save() {
    const data = { 
        name: this.name, 
        description: this.description,
        parentId: this.parentId,
        content: this.content // Ensure content is saved
    };
    if (this.id) {
      await updateDoc(doc(wikiCategoriesCollection, this.id), data);
    } else {
      const docRef = await addDoc(wikiCategoriesCollection, data);
      this.id = docRef.id;
    }
    return this;
  }

  static async findById(id) {
    const docSnap = await getDoc(doc(wikiCategoriesCollection, id));
    return docSnap.exists() ? new WikiCategory({ id: docSnap.id, ...docSnap.data() }) : null;
  }

  static async findAll() {
    const querySnapshot = await getDocs(wikiCategoriesCollection);
    return querySnapshot.docs.map(doc => new WikiCategory({ id: doc.id, ...doc.data() }));
  }

  static async delete(id) {
    await deleteDoc(doc(wikiCategoriesCollection, id));
  }
}

module.exports = WikiCategory;
