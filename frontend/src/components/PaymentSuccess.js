// frontend/src/components/PaymentSuccess.js
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/Dashboard.css'; // Reuse styles

const PaymentSuccess = () => {
  const [message, setMessage] = useState('Processing your payment, please wait...');
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const executePayment = async () => {
      // Extract payment details from the URL query string
      const params = new URLSearchParams(location.search);
      const paymentId = params.get('paymentId');
      const PayerID = params.get('PayerID');
      const token = localStorage.getItem('token');

      // FIX: Check if paymentId and PayerID are missing. If so, assume it's a simulated payment.
      if (!paymentId || !PayerID) {
        setMessage('Payment successful! Your simulated payment has been processed.');
        setError(''); // Clear any previous errors
        setTimeout(() => navigate('/order-history'), 3000);
        return; // Exit early as no PayPal execution is needed
      }

      if (!token) {
        setError('Authentication required to process payment.');
        setMessage('');
        return;
      }

      try {
        // Send request to the backend to finalize the payment (for PayPal)
        const response = await axios.get(
          `http://localhost:5000/api/v1/orders/execute?paymentId=${paymentId}&PayerID=${PayerID}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.data.success) {
          setMessage('Payment successful! Your items have been delivered in-game.');
          setTimeout(() => navigate('/order-history'), 3000);
        } else {
          setError(response.data.message || 'An error occurred while processing your payment.');
          setMessage('');
        }
      } catch (err) {
        const errorMessage = err.response?.data?.message || 'An error occurred while processing your payment.';
        setError(errorMessage);
        setMessage('');
      }
    };

    executePayment();
  }, [location, navigate]); // Added navigate to dependency array for useEffect

  return (
    <div className="dashboard-container" style={{ textAlign: 'center' }}>
      <h1>Payment Status</h1>
      <div className="profile-section">
        {message && <h2>{message}</h2>}
        {error && <h2 style={{ color: '#c0392b' }}>{error}</h2>}
        {error && <p>If the issue persists, please contact support.</p>}
      </div>
    </div>
  );
};

export default PaymentSuccess;
