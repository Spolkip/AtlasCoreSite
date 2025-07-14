// backend/controllers/settingsController.js
const { Setting } = require('../models/Setting'); // Destructure the class from the updated model file.
const logger = require('../utils/logger');
const { getFirestore, collection, getDocs, query, where, addDoc, updateDoc, doc } = require('firebase/firestore');
const { FIREBASE_DB } = require('../config/firebase');

// --- DATA HANDLING FUNCTIONS (Moved from Model to Controller to break circular dependency) ---

// This function now correctly handles the messy data structure from your screenshots.
const findAllSettings = async () => {
  const settingsCollectionRef = collection(FIREBASE_DB, 'settings');
  const querySnapshot = await getDocs(settingsCollectionRef);
  
  let allSettings = [];
  querySnapshot.forEach(doc => {
    const data = doc.data();
    if (doc.id === 'global' && Array.isArray(data.settings)) {
      // Handle the 'global' document with an array
      allSettings = allSettings.concat(data.settings);
    } else if (data.key) {
      // Handle individual setting documents
      allSettings.push({ id: doc.id, ...data });
    }
  });
  return allSettings.map(s => new Setting(s));
};

const upsertSetting = async (data) => {
    const settingsCollectionRef = collection(FIREBASE_DB, 'settings');
    const q = query(settingsCollectionRef, where('key', '==', data.key));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        await addDoc(settingsCollectionRef, data);
    } else {
        const docId = querySnapshot.docs[0].id;
        await updateDoc(doc(FIREBASE_DB, 'settings', docId), data);
    }
};


// --- CONTROLLER EXPORTS ---

exports.getPublicSettings = async (req, res) => {
    try {
        const settings = await findAllSettings();
        const settingsObj = settings.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {});
        res.json(settingsObj);
    } catch (error) {
        logger.error('Error fetching public settings:', error);
        res.status(500).json({ message: 'Error fetching public settings' });
    }
};

exports.getAdminSettings = async (req, res) => {
    try {
        const settings = await findAllSettings();
        res.status(200).json(settings);
    } catch (error) {
        logger.error('Error fetching admin settings:', error);
        res.status(500).json({ message: 'An internal error occurred while fetching admin settings.' });
    }
};

exports.updateAdminSettings = async (req, res) => {
    try {
        const { settings } = req.body;
        if (!Array.isArray(settings)) {
            return res.status(400).json({ message: 'Invalid settings format. Expected an array.' });
        }
        await Promise.all(settings.map(s => upsertSetting(s)));
        res.status(200).json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('--- DETAILED ERROR in updateAdminSettings ---:', error);
        logger.error('Error updating admin settings:', error);
        res.status(500).json({ message: 'An internal error occurred while updating admin settings.' });
    }
};