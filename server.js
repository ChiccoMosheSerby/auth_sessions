const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const alertnode = require('alert-node');
const cors = require('cors');
const app = express();


require('express-namespace');
app.use(bodyParser.urlencoded({
    extended: true
}))

app.use(cors());

const TWO_HOURS = 1000 * 60 * 60 * 2;

//connect mongoose---------------------------------------------------------------
const mongoose = require('mongoose');
const url = "mongodb://chicco:qqwwee123@cluster0-shard-00-00-hn1ba.mongodb.net:27017,cluster0-shard-00-01-hn1ba.mongodb.net:27017,cluster0-shard-00-02-hn1ba.mongodb.net:27017/users?replicaSet=Cluster0-shard-0&ssl=true&authSource=admin";
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('------------------------------> DB conected :users <---------------------');
});
//customers
require("./userSchema");
const userModel = mongoose.model("user");

let users = [];

function getUsersFromDB(newUser) {
    if (!newUser) {
        userModel.find().then((data) => {
            users = data;
            console.log(users)
        })
    }
    else {
        let newUsersToDB = new userModel(newUser);
        newUsersToDB.save().then(() => {

            userModel.find().then((data) => {
                users = data;
                console.log(users)
            })
        })
    }

    return users;
}
getUsersFromDB();

const {
    PORT = 3000,
    SESSION_LIFETIME = TWO_HOURS,
    NODE_ENV = 'development',//development
    SESS_SECRET = 'ssh!cms\'asecret',
    SESS_NAME = 'sid'
} = process.env

const IN_PROD = NODE_ENV === 'production'
app.use(session({
    name: SESS_NAME,
    secret: SESS_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: SESSION_LIFETIME,
        sameSite: true,
        secure: IN_PROD
    }

}))

app.use((req, res, next) => {

    const { userId } = req.session
    if (userId) {
        res.locals.user = users.find(user => user.id === userId)
    }
    next();

})

const redirectLogin = (req, res, next) => {
    if (!req.session.userId) {
        res.redirect('/login')
    }
    else {
        next()
    }
}

const redirectRegister = (req, res, next) => {
    if (!req.session.userId) {
        res.redirect('/register')
    }
    else {
        next()
    }
}
const redirectHome = (req, res, next) => {
    if (req.session.userId) {
        res.redirect('/home')

    }
    else {
        next()
    }
}

app.get('/', (req, res) => {
    const { userId } = req.session;
    // const  userId  = 1;

    console.log(req.session)
    res.send(`
    <h1>Welcome</h1>
    ${userId ? `
     <a href='/home'>Home</a>
    <form method="post" action="/logout">
    <button>Logout</button>
    </form>` :
            `<a href='/login'>Login</a>
    <a href='/register'>Register</a>
    `}`)
})

app.get('/profile', redirectLogin, (req, res) => {
    const { user } = res.locals;
    res.send(`
    <h1>PROFILE Route</h1>
    <a href="">Main</a>
    <ul>
        <li>Name:${user.name}</li>
        <li>Email:${user.email}</li>
    </ul>
    
    <form action='/logout' method='post'>
    <input type='submit' value="Logout" />
    </form>    
    `)
})

app.get('/home', redirectLogin, (req, res) => {
    const { user } = res.locals;
    res.send(`
<h1>Home</h1>
<a href="">Main</a>
<ul>
    <li>Name:${user.name}</li>
    <li>Email:${user.email}</li>
</ul>
<form action='/logout' method='post'>
<input type='submit' value="Logout" />
</form>

`)
})

app.get('/login', redirectHome, (req, res) => {
    res.send(`
    <h1>Login</h1>
    <form action='/login' method='POST'>
    <input type='email' name='email' placeholder='email' required />
    <input type='password' name='password' placeholder='password' required />
    <input type='submit' />
    </form>
    <a href='/register'>Register</a>
    `
    )
})

app.get('/register', redirectHome, (req, res) => {
    res.send(`
    <h1>register</h1>
    <form action='/register' method='POST'>
    <input type='text' name='name' placeholder='name' required />
    <input type='email' name='email' placeholder='email' required />
    <input type='password' name='password' placeholder='password' required />
    <a windows.location.href = '/home'><input type='submit' /></a>
    </form>
    <a href='/login'>login</a>

    `
    )
})

    app.post('/login', redirectHome, (req, res) => {
        const { email, password } = req.body;

        if (email && password) {//TODO: more validation
            const user = users.find(user => user.email === email && user.password === password) //TODO hash

            if (user) {
                req.session.userId = user.id;
                return res.redirect('/home')
            }
        }
        alertnode('wrong email or password - pls try again or register')
        res.redirect('/login')
    })


app.post('/register', redirectHome, (req, res) => {
    const { name, email, password } = req.body;

    if (name && email && password) { //TODO: more validation
        const exists = users.some(
            user => user.email === email
        )

        if (!exists) {
            const user = {
                id: users.length + 1,
                name,
                email,
                password //TODO hash
            }
            users.push(user);
            req.session.userId = user.id;
            getUsersFromDB(user);
            return res.redirect('/home');
        }
    }
    res.redirect('/register') //TODO:  ERROR handler --- > email , pass ...

})


app.post('/logout', redirectLogin, (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/home')
        }
        res.clearCookie(SESS_NAME);
        res.redirect('/login')
    })

})

setInterval(getUsersFromDB, TWO_HOURS); //just in case - update the user List from DB every 2 hours

app.listen(PORT, () => console.log(`- - - - - - - - - - - - - - - - - - - - - - up and runing, http://localhost:${PORT}  - - - - - - - - - - - - - - - -`));