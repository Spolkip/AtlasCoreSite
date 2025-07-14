// frontend/src/components/PaymentCancel.js
import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../css/Dashboard.css'; // Reuse styles

const PaymentCancel = () => {
  const location = useLocation();

  useEffect(() => {
    const cancelOrderOnBackend = async () => {
      const params = new URLSearchParams(location.search);
      const orderId = params.get('transaction_id');
      const authToken = localStorage.getItem('token');

      if (orderId && authToken) {
        try {
          await axios.post(
            'http://localhost:5000/api/v1/orders/cancel',
            { orderId },
            { headers: { Authorization: `Bearer ${authToken}` } }
          );
        } catch (err) {
          // It's not critical to show this error to the user.
          // We can just log it for debugging purposes.
          console.error("Failed to update order status to cancelled:", err);
        }
      }
    };

    cancelOrderOnBackend();
  }, [location]);

  return (
    <div className="dashboard-container" style={{ textAlign: 'center' }}>
      <h1>Payment Cancelled</h1>
      <div className="profile-section">
        <h2>Your payment was cancelled.</h2>
        <p>You have not been charged. You can return to the store to try again.</p>
        <Link to="/shop" className="mc-button">
          Back to Store
        </Link>
      </div>
    </div>
  );
};

export default PaymentCancel;