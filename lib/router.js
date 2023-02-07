const server = require("express");
const flash = require("express-flash");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const client = server();

client.use( flash() );
client.use( cookieParser("kingslimes") );
client.use( server.json({limit:"10gb"}) );
client.use( server.urlencoded({extended:false,limit:"10gb"}) );
client.use( server.static("publish") );
client.use( session({
    resave: !0,
    secret: "kingslimes",
    saveUninitialized: !0,
    cookie: {
        maxAge: 144e4
    },
    store: new session.MemoryStore
}));

client.set("views", "pages");
client.set("view engine", "ejs");

module.exports = { client }