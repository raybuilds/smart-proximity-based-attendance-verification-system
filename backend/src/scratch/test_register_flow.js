const BASE_URL = "http://localhost:5000/api";

async function testRegistrationAndLogin() {
  console.log("=== 1. Student Registration & Login ===");
  const studentEmail = `student_neon_${Math.floor(Math.random() * 100000)}@example.com`;
  const studentPayload = {
    name: "Neon Test Student",
    email: studentEmail,
    password: "Password123",
    department: "CSE",
    rollNumber: `ROLL_NEON_${Math.floor(Math.random() * 100000)}`,
    semester: 5,
    section: "C",
    role: "student"
  };

  try {
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(studentPayload)
    });
    const regData = await regRes.json();
    console.log("Register Status:", regRes.status);
    console.log("Register Response:", regData);

    if (regRes.status === 201) {
      console.log("\nLogging in with new Student account...");
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: studentEmail, password: "Password123" })
      });
      const loginData = await loginRes.json();
      console.log("Login Status:", loginRes.status);
      console.log("Login Response:", loginData);
    }
  } catch (err) {
    console.error("Student Flow Failed:", err);
  }

  console.log("\n=== 2. Teacher Registration & Login ===");
  const teacherEmail = `teacher_neon_${Math.floor(Math.random() * 100000)}@example.com`;
  const teacherPayload = {
    name: "Neon Test Teacher",
    email: teacherEmail,
    password: "Password123",
    department: "CSE",
    role: "teacher"
  };

  try {
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(teacherPayload)
    });
    const regData = await regRes.json();
    console.log("Register Status:", regRes.status);
    console.log("Register Response:", regData);

    if (regRes.status === 201) {
      console.log("\nLogging in with new Teacher account...");
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: teacherEmail, password: "Password123" })
      });
      const loginData = await loginRes.json();
      console.log("Login Status:", loginRes.status);
      console.log("Login Response:", loginData);
    }
  } catch (err) {
    console.error("Teacher Flow Failed:", err);
  }
}

testRegistrationAndLogin();
