const md5 = require("md5");
const { Firebase } = require("@slimedb/firebase");
const { client } = require("./lib/router");

const sqli = new Firebase("https://slimedatabase-realtime-default-rtdb.asia-southeast1.firebasedatabase.app");
sqli.setModel("members", {
    id: Firebase.MimeType.Primary,
    mail: Firebase.MimeType.String,
    hash: Firebase.MimeType.String,
    username: Firebase.MimeType.String,
    password: Firebase.MimeType.String
})


client.get("/auth/login", ( request, response ) => {
    response.render("login");
})

client.post("/auth/login", ( request, response) => {
    console.log( request.body )
    response.render("login");
})

client.get("/auth/register", ( request, response ) => {
    response.render("register");
})

client.post("/auth/register", async ( request, response ) => {
    const
        mail = request.body.mail,
        username = request.body.username,
        password = request.body.password,
        password_repeat = request.body.password_repeat;
    
    if ( !mail || !username || !password ) return response.render("register");
    const errorReport = new Array();
    if ( !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(mail) ) errorReport.push("Email");
    if ( username.replace(/[\d]/g, "").length < 4 ) errorReport.push("Username");
    if ( password.replace(/[\d]/g, "").length < 2 ) errorReport.push("Password");
    if ( password_repeat !== password ) errorReport.push("Password repeat");
    if ( errorReport.length > 0 ) {
        await request.flash("errorType", "invalid");
        await request.flash("error", errorReport);
        await request.flash("mail", mail);
        await request.flash("username", username);
        await request.flash("password", password);
        await request.flash("password_repeat", password_repeat);
        return response.render("register");
    }
    const members = await sqli.query("members");
    const existsMail = members.find( i => i.mail == mail );
    const existsUsername = members.find( i => i.username == username );
    if ( existsMail ) await request.flash("error", "Email");
    if ( existsUsername ) await request.flash("error", "Username");
    if ( existsMail || existsUsername ) {
        await request.flash("mail", mail);
        await request.flash("username", username);
        await request.flash("password", password);
        await request.flash("errorType", "exists");
    } else {
        await sqli.insert("members", {
            mail: mail,
            hash: md5( password ),
            username: username,
            password: password
        });
        await request.flash("login", [username, password]);
    }
    response.render("register");
    return !0
})

client.listen( 5555 )