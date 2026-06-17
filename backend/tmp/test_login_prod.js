(async () => {
  const loginUrl = 'https://attendance-system-backend-unu2.onrender.com/api/auth/login';
  const payload = {
    email: 'prodstudent123@example.com',
    password: 'Password123',
  };
  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  console.log('Login status:', response.status);
  console.log('Response body:', text);
})();
