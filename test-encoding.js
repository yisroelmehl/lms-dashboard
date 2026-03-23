const token = "349078ea850295700e45ba417a4d216e";
const url = "https://school.lemaanyilmedo.org/webservice/rest/server.php";
const body = new URLSearchParams({
  wstoken: token,
  wsfunction: "local_usersmanager_create_user",
  moodlewsrestformat: "json",
  username: "hebrewtest" + Date.now(),
  password: "Password1!",
  firstname: "ישראל",
  lastname: "ישראלי",
  email: "hebrewtest" + Date.now() + "@example.com"
});

fetch(url, {
  method: "POST",
  body,
  headers: { "Content-Type": "application/x-www-form-urlencoded" }
}).then(res => res.json()).then(console.log);
