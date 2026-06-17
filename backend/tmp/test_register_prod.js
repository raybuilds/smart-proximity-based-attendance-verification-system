(async () => {
  const url = 'https://attendance-system-backend-unu2.onrender.com/api/auth/register';
  const payload = {
    name: 'Prod Test Student',
    email: 'prodstudent123@example.com',
    password: 'Password123',
    role: 'student',
    rollNumber: 'ROLL_PROD_001',
    department: 'CSE',
    semester: 5,
    section: 'C',
  };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Body:', text);
  } catch (err) {
    console.error('Error:', err);
  }
})();
