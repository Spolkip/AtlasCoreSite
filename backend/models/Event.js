// backend/models/Event.js
const { FIREBASE_DB } = require('../config/firebase');
const { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, Timestamp } = require('firebase/firestore');

const eventsCollection = collection(FIREBASE_DB, 'events');

class Event {
  constructor(data) {
    this.id = data.id || null;
    this.title = data.title;
    this.description = data.description || '';
    // Ensure date is stored and retrieved as a Firestore Timestamp or JS Date
    this.date = data.date instanceof Timestamp ? data.date.toDate() : (data.date || new Date());
    this.type = data.type || 'event'; // e.g., 'major', 'event', 'announcement', 'info'
    this.createdAt = data.createdAt || new Date();
  }

  async save() {
    const eventData = {
      title: this.title,
      description: this.description,
      // Convert JS Date to Firestore Timestamp for saving
      date: this.date instanceof Date ? Timestamp.fromDate(this.date) : this.date,
      type: this.type,
      createdAt: this.createdAt instanceof Date ? Timestamp.fromDate(this.createdAt) : this.createdAt,
    };
    if (this.id) {
      await updateDoc(doc(eventsCollection, this.id), eventData);
    } else {
      // For new events, set createdAt on save
      eventData.createdAt = Timestamp.now();
      const docRef = await addDoc(eventsCollection, eventData);
      this.id = docRef.id;
    }
    return this;
  }

  static async findById(id) {
    const docSnap = await getDoc(doc(eventsCollection, id));
    return docSnap.exists() ? new Event({ id: docSnap.id, ...docSnap.data() }) : null;
  }

  static async findAll() {
    const q = query(eventsCollection, orderBy('date', 'asc')); // Order by date ascending
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => new Event({ id: doc.id, ...doc.data() }));
  }

  static async delete(id) {
    await deleteDoc(doc(eventsCollection, id));
  }
}

module.exports = Event;
