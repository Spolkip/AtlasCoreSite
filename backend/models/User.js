// backend/models/User.js
const { FIREBASE_DB } = require('../config/firebase');
const { collection, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, getDocs } = require('firebase/firestore');

const usersCollection = collection(FIREBASE_DB, 'users');

class User {
  constructor(data) {
    const source = data || {};
    this.id = source.id || null;
    this.username = source.username || '';
    this.email = source.email || '';
    this.password = source.password || '';
    this.minecraft_uuid = source.minecraft_uuid || '';
    this.minecraft_username = source.minecraft_username || '';
    this.is_verified = typeof source.is_verified === 'boolean' ? source.is_verified : false;
    this.is_profile_public = typeof source.is_profile_public === 'boolean' ? source.is_profile_public : true;
    this.used_promo_codes = source.used_promo_codes || [];
    this.reset_password_token = source.reset_password_token || null;
    this.reset_password_expire = source.reset_password_expire || null;
    this.profile_theme = source.profile_theme || 'default';

    // MODIFIED: Keep is_admin for backward compatibility and highest access check
    this.is_admin = typeof source.is_admin === 'number' ? source.is_admin : 0; 

    // MODIFIED: Initialize roles based on existing is_admin status or default to ['user']
    if (Array.isArray(source.roles)) {
      this.roles = source.roles;
    } else if (this.is_admin === 1) {
      this.roles = ['admin']; // If existing user is admin, give them the 'admin' role
    } else {
      this.roles = ['user']; // Default role for new or non-admin users
    }

    this.created_at = source.created_at || new Date();
    this.updated_at = source.updated_at || new Date();
  }

  async save() {
    try {
      const userData = {
        username: this.username,
        email: this.email,
        password: this.password,
        is_admin: this.is_admin, // Keep is_admin for highest level access
        roles: this.roles, // Save the roles array
        is_verified: this.is_verified,
        minecraft_uuid: this.minecraft_uuid,
        minecraft_username: this.minecraft_username,
        is_profile_public: this.is_profile_public,
        used_promo_codes: this.used_promo_codes,
        reset_password_token: this.reset_password_token,
        reset_password_expire: this.reset_password_expire,
        profile_theme: this.profile_theme,
        created_at: this.created_at,
        updated_at: new Date(),
      };
      if (this.id) {
        await updateDoc(doc(usersCollection, this.id), userData);
      } else {
        const newUserRef = await addDoc(usersCollection, userData);
        this.id = newUserRef.id;
      }
      return this;
    } catch (error) {
      console.error("Error saving user:", error);
      throw error;
    }
  }

  async update(fieldsToUpdate) {
    if (!this.id) throw new Error("Cannot update a user without an ID.");
    try {
      const updatedData = { ...fieldsToUpdate, updated_at: new Date() };
      
      // Ensure roles are handled correctly if updated via this method
      if (Array.isArray(updatedData.roles)) {
        // If 'admin' role is added/removed, update is_admin accordingly
        if (updatedData.roles.includes('admin')) {
          updatedData.is_admin = 1;
        } else if (this.is_admin === 1 && !updatedData.roles.includes('admin')) {
          // Only set to 0 if it was 1 and 'admin' role is explicitly removed
          updatedData.is_admin = 0;
        }
      } else {
        // If roles is not an array in the update, make sure it's not accidentally overwritten
        delete updatedData.roles;
      }
      
      await updateDoc(doc(usersCollection, this.id), updatedData);
      Object.assign(this, updatedData);
      return this;
    } catch (error) {
      console.error("Error updating user fields:", error);
      throw error;
    }
  }

  // ADDED: Helper to check if a user has a specific role
  hasRole(role) {
    return this.roles.includes(role);
  }
}

// Static Methods
User.findById = async function(id) {
  if (!id) return null;
  const userDocSnap = await getDoc(doc(usersCollection, id));
  // Ensure that the constructor logic handles the conversion from is_admin to roles
  return userDocSnap.exists() ? new User({ id: userDocSnap.id, ...userDocSnap.data() }) : null;
};

User.findByEmail = async function(email) {
  if (!email) return null;
  const q = query(usersCollection, where('email', '==', email));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  const userDoc = querySnapshot.docs[0];
  return new User({ id: userDoc.id, ...userDoc.data() });
};

User.findByUsername = async function(username) {
  if (!username) return null;
  const q = query(usersCollection, where('username', '==', username));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  const userDoc = querySnapshot.docs[0];
  return new User({ id: userDoc.id, ...userDoc.data() });
};

User.delete = async function(id) {
  if (!id) throw new Error("Cannot delete a user without an ID.");
  await deleteDoc(doc(usersCollection, id));
  return true;
};

module.exports = User;
