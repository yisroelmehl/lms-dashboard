import { prisma } from './src/lib/prisma';
async function run() {
  const latestLink = await prisma.paymentLink.findFirst({
    where: { studentId: { not: null } },
    orderBy: { createdAt: 'desc' },
    include: { student: true }
  });
  console.log("Latest Link:", latestLink?.firstName, latestLink?.lastName, latestLink?.email);
  console.log("Student Record:", latestLink?.student);
  
  if (latestLink) {
    const jsonStr = latestLink.registrationData ? JSON.stringify(latestLink.registrationData) : "null";
    console.log("RegistrationData:", jsonStr);
  }
}
run();
