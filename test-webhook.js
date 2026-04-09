const kUrl = new URL("https://ultra.kesherhk.info/external/paymentPage/2446101103");
const params = new URLSearchParams();
params.set("name", "Test Name");
params.set("total", "1000");
params.set("currency", "1");
params.set("numpayment", "3");
params.set("credittype", "8");
kUrl.search = params.toString();
console.log(kUrl.toString());
