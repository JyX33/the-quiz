import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background: ${(props) => props.theme.background};
  height: 100vh;
  padding: 20px;
`;

const Input = styled.input`
  margin: 10px;
  padding: 8px;
  border: 1px solid ${(props) => props.theme.primary};
`;

const Button = styled.button`
  padding: 10px;
  background: ${(props) => props.theme.primary};
  color: ${(props) => props.theme.accent};
  border: none;
  cursor: pointer;
`;

const LoginPage = ({ setUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    axios
      .post('http://localhost:5000/api/users/login', { username, password })
      .then((res) => {
        localStorage.setItem('token', res.data.token);
        axios
          .get('http://localhost:5000/api/users/me', {
            headers: { Authorization: `Bearer ${res.data.token}` },
          })
          .then((userRes) => {
            setUser(userRes.data);
            navigate('/home');
          });
      })
      .catch((err) => console.error(err));
  };

  return (
    <Container>
      <h1>Login</h1>
      <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button onClick={handleLogin}>Login</Button>
      <Button onClick={() => navigate('/register')}>Register</Button>
    </Container>
  );
};

export default LoginPage;