import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  text-align: center;
  color: #2c3e50;
  margin-bottom: 1.5rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: #34495e;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s;

  &:focus {
    border-color: #3498db;
    outline: none;
  }
`;

const Button = styled.button`
  padding: 0.75rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #2980b9;
  }

  &:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
  }
`;

const Message = styled.p`
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  text-align: center;
`;

const ErrorMessage = styled(Message)`
  background-color: #fdecea;
  color: #d32f2f;
`;

const SuccessMessage = styled(Message)`
  background-color: #e8f5e9;
  color: #2e7d32;
`;

const LinkMinecraft = () => {
  const [minecraftUsername, setMinecraftUsername] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear messages after 5 seconds
    const timer = setTimeout(() => {
      if (error || success) {
        setError('');
        setSuccess('');
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [error, success]);

  const validateUsername = (username) => {
    // Minecraft usernames are 3-16 characters, alphanumeric and underscores
    return /^[a-zA-Z0-9_]{3,16}$/.test(username);
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateUsername(minecraftUsername)) {
      setError('Invalid Minecraft username (3-16 characters, letters, numbers and underscores only)');
      return;
    }

    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/v1/auth/send-verification-code`,
        { username: minecraftUsername },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      setSuccess('A verification code has been sent to you in-game.');
      setStep(2);
    } catch (err) {
      let errorMessage = 'Failed to send verification code.';
      
      if (err.response) {
        if (err.response.status === 401) {
          errorMessage = 'Session expired. Please login again.';
          setTimeout(() => navigate('/login'), 1500);
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/v1/auth/link-minecraft`,
        { username: minecraftUsername, verificationCode },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      setSuccess(response.data.message || 'Minecraft account linked successfully!');
      setTimeout(() => navigate('/dashboard'), 2000);

    } catch (err) {
      let errorMessage = 'Failed to link Minecraft account';
      
      if (err.response) {
        if (err.response.status === 401) {
          errorMessage = 'Session expired. Please login again.';
          setTimeout(() => navigate('/login'), 1500);
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Container>
      <Title>Link Your Minecraft Account</Title>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      
      {step === 1 ? (
        <Form onSubmit={handleUsernameSubmit}>
          <FormGroup>
            <Label htmlFor="minecraft-username">Minecraft Username</Label>
            <Input
              id="minecraft-username"
              type="text"
              value={minecraftUsername}
              onChange={(e) => setMinecraftUsername(e.target.value)}
              placeholder="Enter your Minecraft username"
              required
              maxLength={16}
            />
          </FormGroup>
          
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Sending Code...' : 'Get Verification Code'}
          </Button>
        </Form>
      ) : (
        <Form onSubmit={handleVerificationSubmit}>
          <FormGroup>
            <Label htmlFor="verification-code">Verification Code</Label>
            <Input
              id="verification-code"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter the code from in-game"
              required
            />
          </FormGroup>
          
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Verifying...' : 'Link Account'}
          </Button>
        </Form>
      )}
    </Container>
  );
};

export default LinkMinecraft;