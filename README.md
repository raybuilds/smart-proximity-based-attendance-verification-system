# Smart Proximity-Based Attendance Verification System

Phase 1 foundation for a scalable attendance platform with:

- `backend/` for the Node.js, Express, Prisma, and PostgreSQL API
- `mobile/` for the Expo React Native application

## Backend install commands

```bash
cd backend
npm install express cors dotenv jsonwebtoken bcrypt zod prisma @prisma/client
npm install -D nodemon
npx prisma generate
```

## Mobile install commands

```bash
cd mobile
npx create-expo-app@latest . --template blank
npm install @react-navigation/native @react-navigation/native-stack axios @react-native-async-storage/async-storage
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated
```

## Run commands

```bash
cd backend
npm run dev
```

```bash
cd mobile
npm start
```
