import { getUserByEmail, createUser, enrolUser } from './src/lib/moodle/endpoints';

async function run() {
  const user = await getUserByEmail('test@example.com');
  console.log('User:', user);
  if (user) {
    // Try to enrol them to course ID 5 or something
    // const res = await enrolUser(user.id, 5);
    // console.log('Enrol result:', res);
  }
}
run();
