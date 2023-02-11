const fs = require('fs');
const md5 = require("md5");
const path = path = require('path');
const { Firebase } = require("@slimedb/firebase");
const { client } = require("./lib/router");
const { google } = require('googleapis');
const GOOGLE_API_FOLDER_ID = '1-sQEbClcbj6xmywa5XygM3wWfGCWWF69';
const short = require('shortid');

const sqli = new Firebase("https://slimedatabase-realtime-default-rtdb.asia-southeast1.firebasedatabase.app");
sqli.setModel("members", {
    id: Firebase.MimeType.Primary,
    mail: Firebase.MimeType.String,
    hash: Firebase.MimeType.String,
    username: Firebase.MimeType.String,
    password: Firebase.MimeType.String,
    create: Firebase.MimeType.DateTime
});
sqli.setModel("manga", {
    id: Firebase.MimeType.Primary,
    member_id: Firebase.MimeType.String,
    title: Firebase.MimeType.String,
    thumbnail: Firebase.MimeType.String,
    description: Firebase.MimeType.String,
    update: Firebase.MimeType.String,
    create: Firebase.MimeType.Timestamp
});
sqli.setModel("episode", {
    id: Firebase.MimeType.Primary,
    manga_id: Firebase.MimeType.String,
    images: Firebase.MimeType.Varchar,
    chapter: Firebase.MimeType.String,
    title: Firebase.MimeType.String,
    create: Firebase.MimeType.Timestamp
})

client.get("/:username/new", async ( request, response ) => {
    if ( request.session.username != request.params.username ) return response.render("404");
    response.render("new_manga", {
        user: request.params.username
    });
})

client.post("/:username/new", async ( request, response ) => {
    if ( request.session.username != request.params.username ) return response.render("404");
    Object.assign(request.body, {
        member_id: request.session.userID
    });
    await sqli.insert("manga", request.body);
    const manga = await sqli.query("manga");
    const result = manga.filter( i => i.member_id == request.session.userID ).slice(-1);
    response.redirect(`./manga/${result[0].id}`);
})

client.get("/:username/manga", async ( request, response ) => {

})

client.get("/:username", async ( request, response ) => {
    const members = await sqli.query("members");
    const user = members.find( i => i.username == request.params.username );
    if ( !user ) return response.render("404");

    const result = await sqli.query("manga");
    const manga = result.filter( i => i.member_id == user.id );

    for ( let ix=0; ix<manga.length; ix++ ) {
        const episode = await sqli.query("episode");
        const chapter = episode.filter( i => i.manga_id == manga[ix].id );
        Object.assign( manga[ix], { episode:chapter } );
    }
    response.render("user_content", {
        user: request.params.username,
        admin: request.params.username == request.session.username,
        manga: manga
    });
})

client.all("/auth/logout", ( request, response ) => {
    request.session.destroy();
    response.redirect("/auth/login");
})

client.get("/auth/login", ( request, response ) => {
    if ( request.session.username ) return response.redirect( request.session.admin );
    response.render("login");
})

client.post("/auth/login", async ( request, response) => {
    const
        username = request.body.username,
        password = request.body.password;

    if ( !username || !password ) return response.render("register");
    let loinSuccess = false;
    const members = await sqli.query("members");
    const user = members.find( i => i.username == username );
    if ( user ) {
        if ( user.hash == md5( password ) ) {
            loinSuccess = true
            request.session.userID = user.id;
            request.session.username = user.username;
            request.session.admin = `/${user.username}`;
            request.session.timestamp = new Date().getTime();
            await request.flash("start", request.session.admin);
        } else {
            await request.flash("error", true);
        }
    } else {
        await request.flash("error", true);
    }
    if ( !loinSuccess ) {
        await request.flash("username", username);
        await request.flash("password", password);
    }
    response.render("login");
    return !0
})

client.get("/auth/register", ( request, response ) => {
    if ( request.session.username ) return response.redirect( request.session.admin );
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

const convertBase64 = ( url ) => {
    let encoded = url.toString().replace(/^data:(.*,)?/, '');
    let len = encoded.length % 4;
    if ( len > 0 ) encoded += '='.repeat(4 - len);
    return encoded;
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onload = () => {
            let encoded = fileReader.result.toString().replace(/^data:(.*,)?/, '');
            if ((encoded.length % 4) > 0) {
                encoded += '='.repeat(4 - (encoded.length % 4));
            }
            resolve(encoded);
        };
        fileReader.onerror = (error) => {
            reject(error);
        };
    });
};

client.post('/api/v1/file', async (req,res) => {
    const pathName = './stream/' + short.generate() + '.stream';

    req.body.img = convertBase64(req.body.image);
    fs.writeFileSync(pathName, req.body.img, {
        encoding: 'base64'
    });
    
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: './lib/google.json',
            scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/cloud-platform']
        })
        const driveService = google.drive({
            version: 'v3',
            auth
        })
        const NAMESPACE = `${ new Date().getTime() }`;
        const fileMetaData = {
            'name': NAMESPACE,
            'parents': [GOOGLE_API_FOLDER_ID]
        }
        const media = {
            mimeType: req.body.mimeType || "image/webp",
            body: fs.createReadStream(pathName)
        }
        const response = await driveService.files.create({
            resource: fileMetaData,
            media: media,
            field: 'id'
        })
        res.json({
            id: response.data.id,
            name: NAMESPACE
        })
    } catch(err) {
        res.json({
            message: err
        })
    }
    fs.unlinkSync(pathName);
})

client.all("*", ( request, response ) => {
    response.render("404");
})

client.listen( 5555 )