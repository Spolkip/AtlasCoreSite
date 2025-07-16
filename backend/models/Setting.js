// backend/models/Setting.js
const { FIREBASE_DB } = require('../config/firebase');
const { collection, doc, getDoc, updateDoc, deleteDoc, addDoc, getDocs, query, where } = require('firebase/firestore');

const settingsCollection = collection(FIREBASE_DB, 'settings');

class Setting {
  constructor(data) {
    this.id = data.id || null;
    this.key = data.key;
    this.value = data.value;
  }

  async save() {
    const settingData = {
      key: this.key,
      value: this.value,
    };
    if (this.id) {
      await updateDoc(doc(settingsCollection, this.id), settingData);
    } else {
      const newSettingRef = await addDoc(settingsCollection, settingData);
      this.id = newSettingRef.id;
    }
    return this;
  }

  async update(fieldsToUpdate) {
    if (!this.id) throw new Error("Cannot update a setting without an ID.");
    const updatedData = { ...fieldsToUpdate };
    await updateDoc(doc(settingsCollection, this.id), updatedData);
    Object.assign(this, updatedData);
    return this;
  }
}

// Static Methods are now handled in the controller to avoid circular dependencies.

module.exports = { Setting };
