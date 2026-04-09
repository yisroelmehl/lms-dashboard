import { getLinkToken } from "./src/lib/kesher/client";
import { prisma } from "./src/lib/prisma";

async function test() {
  try {
    const link = await prisma.paymentLink.findFirst({
      where: { kesherPaymentPageId: { not: null } },
      orderBy: { createdAt: 'desc' }
    });
    if (!link) {
      console.log("No link found");
      return;
    }
    console.log("Testing with link finalAmount:", link.finalAmount);
    const resp = await getLinkToken({
      PaymentPageId: link.kesherPaymentPageId as string,
      Total: String(link.finalAmount),
      Currency: 1,
      CreditType: 8,
      NumPayment: 12,
      FirstName: "Test",
      LastName: "Test",
    });
    console.log("Response:", JSON.stringify(resp, null, 2));
  } catch (err: any) {
    if (err.rawResponse) {
       console.error("KESHER ERROR RAW:", JSON.stringify(err.rawResponse, null, 2));
    }
    console.error("Error:", err.message, err.rawResponse || err);
  } finally {
    process.exit(0);
  }
}
test();
