// backend/models/VlogPost.js
const { FIREBASE_DB } = require('../config/firebase');
const { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy } = require('firebase/firestore');

const vlogPostsCollection = collection(FIREBASE_DB, 'vlog_posts');

class VlogPost {
  constructor(data) {
    this.id = data.id || null;
    this.title = data.title;
    this.content = data.content;
    this.author = data.author || 'AtlasCore Team';
    this.createdAt = data.createdAt || new Date();
  }

  async save() {
    const data = {
      title: this.title,
      content: this.content,
      author: this.author,
      createdAt: this.createdAt,
    };
    if (this.id) {
      await updateDoc(doc(vlogPostsCollection, this.id), data);
    } else {
      // For new posts, set createdAt on save
      data.createdAt = new Date();
      const docRef = await addDoc(vlogPostsCollection, data);
      this.id = docRef.id;
    }
    return this;
  }

  static async findById(id) {
    const docSnap = await getDoc(doc(vlogPostsCollection, id));
    return docSnap.exists() ? new VlogPost({ id: docSnap.id, ...docSnap.data() }) : null;
  }

  static async findAll() {
    const q = query(vlogPostsCollection, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => new VlogPost({ id: doc.id, ...doc.data() }));
  }

  static async delete(id) {
    await deleteDoc(doc(vlogPostsCollection, id));
  }
}

module.exports = VlogPost;
