const { FIREBASE_DB } = require('../config/firebase');
const { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where } = require('firebase/firestore');

const wikiPagesCollection = collection(FIREBASE_DB, 'wikipages');

class WikiPage {
  constructor(data) {
    this.id = data.id || null;
    this.title = data.title;
    this.content = data.content;
    // A page might not belong to a category if it's just a linkable entity
    this.categoryId = data.categoryId || 'uncategorized'; 
  }

  async save() {
    const data = { title: this.title, content: this.content, categoryId: this.categoryId };
    if (this.id) {
      await updateDoc(doc(wikiPagesCollection, this.id), data);
    } else {
      const docRef = await addDoc(wikiPagesCollection, data);
      this.id = docRef.id;
    }
    return this;
  }

  static async findById(id) {
    const docSnap = await getDoc(doc(wikiPagesCollection, id));
    return docSnap.exists() ? new WikiPage({ id: docSnap.id, ...docSnap.data() }) : null;
  }

  static async findByCategoryId(categoryId) {
    const q = query(wikiPagesCollection, where('categoryId', '==', categoryId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => new WikiPage({ id: doc.id, ...doc.data() }));
  }

  // New method to get all pages
  static async findAll() {
    const querySnapshot = await getDocs(wikiPagesCollection);
    return querySnapshot.docs.map(doc => new WikiPage({ id: doc.id, ...doc.data() }));
  }

  static async delete(id) {
    await deleteDoc(doc(wikiPagesCollection, id));
  }
}

module.exports = WikiPage;
