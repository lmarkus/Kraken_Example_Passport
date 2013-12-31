# Kraken_Example_Passport

A simple application that manages users with [passport](http://passportjs.org/) and [KrakenJS](http://www.krakenjs.com)

## Introduction
In many cases you'll need to manage users in your application. Here's a simple application that will show you how to restrict access to certain
parts of your application based on user authentication.

This example highlights the following things:

* Using passport.js to handle user authentication.
* Using a mongoose model to represent user data.
* Using bcrypt to securely hash and salt user passwords before storing them in a database.
* Storing credentials in a Mongo database.
* Limiting access to certain parts of your application based on user roles.

This repository was created specifically to hold the example. If you look at the [commit list](https://github.com/lmarkus/Kraken_Example_Passport/commits/master), you will see
how the shopping cart was built, step by step.

## Prerequisites
* This example requires that [MongoDB](http://www.mongodb.org/downloads) is installed and running on it's default port.
* You will --of course-- need [Node](http://nodejs.org) (Version >= 0.10.22 preferred)
* The Kraken generator. If you havent yet installed it, simply do: `sudo npm install -g generator-kraken`

## Create the app
Let's create our example app using the generator:

`yo kraken`

Just follow the prompts, and you'll have a plain vanilla app in a few clicks.

```bash
$ yo kraken

     ,'""`.
    / _  _ \
    |(@)(@)|   Release the Kraken!
    )  __  (
   /,'))((`.\
  (( ((  )) ))
   `\ `)(' /'

[?] Application name: Kraken_Example_Passport
[?] Description: A Kraken application that highlights the use of Passport middleware for Authentication
[?] Author: @LennyMarkus
[?] Use RequireJS? No

```
The generator will set up the app and install the dependencies. After it's done, just go into the newly created directory
`cd Kraken_Example_Passport`

[<img src='http://upload.wikimedia.org/wikipedia/commons/thumb/2/25/External.svg/600px-External.svg.png' width='12px' height='12px'/>View commit](https://github.com/lmarkus/Kraken_Example_Passport/commit/0b4869f341a323efac8ab573baaa2b1807f20def)

## A little style
The Kraken is pretty vain, so we'll add a bit of styling to our master layout, as well as a few assets to the project to make it look good. These changes are just cosmetic,

[<img src='http://upload.wikimedia.org/wikipedia/commons/thumb/2/25/External.svg/600px-External.svg.png' width='12px' height='12px'/>View commit](https://github.com/lmarkus/Kraken_Example_Passport/commit/076099db648eb2c2632eccb1bcf30cd0055402d2)

## Add dependencies
We'll be using a few libraries to support out project:
* `mongoose` for connecting to the Mongo database, and to create the User schema.
* `passport` and `passport-local` for authentication.
* `bcrypt` to [securely](http://codahale.com/how-to-safely-store-a-password/) hash and salt user credentials. (Trust us, you don't want to be [in the news](http://arstechnica.com/security/2013/11/hack-of-cupid-media-dating-website-exposes-42-million-plaintext-passwords/) because of this).
* `connect-flash` to show login error messages to the user.

```bash
npm install --save mongoose
npm install --save bcrypt
npm install --save passport
npm install --save passport-local
npm install --save connect-flash
```

[<img src='http://upload.wikimedia.org/wikipedia/commons/thumb/2/25/External.svg/600px-External.svg.png' width='12px' height='12px'/>View commit](https://github.com/lmarkus/Kraken_Example_Passport/commit/7f190d751932a6a66d51a5527c5ff1b0f6014da5)

## Adding some custom configuration
Our application will connect to a database, so we need to supply some information such as the host name, and schema to
connect to. Hardcoding these values is a bad idea, so instead we'll use the kraken configuration file: `./config/app.json`.

We'll add the following db credentials to `./config/app.json`:
```json
    "databaseConfig": {
        "host": "localhost",
        "database": "passportTest"
    }
```

In addition, let's add some configurable parameters to our bcrypt hashing (A higher [difficulty](http://wildlyinaccurate.com/bcrypt-choosing-a-work-factor) will result in a slower but more secure hash):
```json
    "bcrypt": {
        "difficulty": 8
    }
```


This configuration will be parsed by the application on startup using `nconf`. The data will then be accessible within the
application.

[<img src='http://upload.wikimedia.org/wikipedia/commons/thumb/2/25/External.svg/600px-External.svg.png' width='12px' height='12px'/>View commit](https://github.com/lmarkus/Kraken_Example_Passport/commit/5b1eaac146ada7e823d8348b375f321c683923e9)

## Database connectivity
### Setting up a library to talk to the database
For this example we'll be using [Mongoose](http://mongoosejs.com/) to talk to our database, as well as for creating some
object models. But before we can do any of this, we'll need to connect to the database.

Let's create `./lib/database.js`

```javascript
'use strict';
var mongoose = require('mongoose');

var db = function () {
    return {
        config: function (conf) {
            mongoose.connect('mongodb://' + conf.host + '/' + conf.database);
            var db = mongoose.connection;
            db.on('error', console.error.bind(console, 'connection error:'));
            db.once('open', function callback() {
                console.log('db connection open');
            });
        }
    };
};

module.exports = db();
```

This returns an object with a `config` function that will be used to receive the parsed configuration from the previous step.
Using this configuration it will open a connection to the database: `mongoose.connect('mongodb://' + conf.host + '/' + conf.database);`

### Configuring the database
Kraken gives you the ability to customize how you initialize your application in four different points:
* During configuration.
* Before most middleware has been set.
* After middleware has been set but before the routes have been created.
* After the routes have been created.

We want to set up our database connection during the configuration phase, so we're going to make use of the `app.configure`
method in `./index.js`

First, we'll _require_ our database library `var db = require('./lib/database')`, and then, we'll call it's `config()` method
passing along the `databaseConfig` section of the parsed configuration from the first step.

```javascript
app.configure = function configure(nconf, next) {
    //Configure the database
    db.config(nconf.get('databaseConfig'));
    next(null);
};
```

[<img src='http://upload.wikimedia.org/wikipedia/commons/thumb/2/25/External.svg/600px-External.svg.png' width='12px' height='12px'/>View commit](https://github.com/lmarkus/Kraken_Example_Passport/commit/d59b0f9feed6b508aca2e2ab5b997732682e8c8d)

You can give your application a go at this point.  If all goes well, a connection to the database will be opened
``` javascript
$npm start

Listening on 8000
db connection open
```

## Creating a User model
The user model will represent the schema for the User objects we'll store in the database. We're going to take advantage of the mongoose features
to transparently handling credential encryption and testing.

Let's create `./models/user.js`

The schema will be simple. A name, login, password and role:
```javascript
var userSchema = mongoose.Schema({
    name: String,
    login: { type: String, unique: true },  //Ensure logins are unique.
    password: String, //We'll store bCrypt hashed passwords.  Just say no to plaintext!
    role: String
});
```

In order to store hashed passwords, we're going to hook into the `save` event of the user schema. Whenever the application wants to save
a user to the database, we'll check to make sure that the password is properly encrypted. If it's plaintext, we'll run it through bcrypt
befor saving to the database.

```javascript
userSchema.pre('save', function (next) {
    var user = this;

    //If the password has not been modified in this save operation, leave it alone (So we don't double hash it)
    if (!user.isModified('password')) {
        next();
        return;
    }

    //Encrypt it using bCrypt. Using the Sync method instead of Async to keep the code simple.
    //DIFFICULTY is the bcrypt work factor, which has been set in the configuration.
    var hashedPwd = bcrypt.hashSync(user.password, DIFFICULTY);

    //Replace the plaintext pw with the Hash+Salted pw;
    user.password = hashedPwd;

    //Continue with the save operation
    next();
});
```

Finally, we'll need a way to test if a supplied password matches the one in the database. We're going to build this method into the User schema:
```javascript
userSchema.methods.passwordMatches = function (plainText) {
    var user = this;
    return bcrypt.compareSync(plainText, user.password);
}
```

[<img src='http://upload.wikimedia.org/wikipedia/commons/thumb/2/25/External.svg/600px-External.svg.png' width='12px' height='12px'/>View commit](https://github.com/lmarkus/Kraken_Example_Passport/commit/0bb85e58bf55635570c2f5004348dd91c238677e)

## Securing some resources

### Adding the private area
Now let's create a couple of restricted areas for our users:

* `/` The homepage will be kept open to everyone.
* `/profile` This is a simple user profile page. It can only be viewed by any user who has logged into the system.
* `/admin` The Administrator section of the site. This section can only be viewed by users with the `admin` role.

We'll use the generator to create the `profile` and `admin` pages quickly. The generator will create controllers, models, templates, tests and content
s bundle for us, saving us from some tedious work.
(This example won't use XHR request, so just answer *no* at the prompts:

```bash
yo kraken:page admin
   invoke   kraken:controller:/usr/local/lib/node_modules/generator-kraken/page/index.js
[?] Respond to XHR requests? No

...

yo kraken:page profile
   invoke   kraken:controller:/usr/local/lib/node_modules/generator-kraken/page/index.js
[?] Respond to XHR requests? No
```
[<img src='http://upload.wikimedia.org/wikipedia/commons/thumb/2/25/External.svg/600px-External.svg.png' width='12px' height='12px'/>View commit](https://github.com/lmarkus/Kraken_Example_Passport/commit/95c247b62f48ce1bf6db3aade0a0a3d00f950984)


We're going to very lightly customize these pages, and add a navigation menu to the master layout.
[<img src='http://upload.wikimedia.org/wikipedia/commons/thumb/2/25/External.svg/600px-External.svg.png' width='12px' height='12px'/>View commit](https://github.com/lmarkus/Kraken_Example_Passport/commit/2d7ffddbf170b8c2df9dc5adc365cae661e33a59)

Give the application a spin. Everything is in place now, but there are no access restrictions. Let's change that.

### Locking the door

Let's create a library to handle all the authentication tasks for us: `./lib/auth.js`

It will have three components.

First an authentication strategy that `passport` can use to determine if a user should be allowed in. We'll use an instance of `LocalStrategy` to
receive the username and password from  the login form, and try to match it against credentials from our database.
(Take a look at the passport documentation for [other options](http://passportjs.org/guide/oauth/)).

```javascript
exports.localStrategy = function () {

    return new LocalStrategy(function (username, password, done) {

        //Retrieve the user from the database by login
        User.findOne({login: username}, function (err, user) {

            //If something weird happens, abort.
            if (err) {
                return done(err);
            }

            //If we couldn't find a matching user, flash a message explaining what happened
            if (!user) {
                return done(null, false, { message: 'Login not found' });
            }

            //Make sure that the provided password matches what's in the DB.
            if (!user.passwordMatches(password)) {
                return done(null, false, { message: 'Incorrect Password' });
            }

            //If everything passes, return the retrieved user object.
            done(null, user);

        });
    });
}
```

Second, a helper function to determine if the current user has been authenticated, and optionally check the role that the
user has.
**Side Note:**  `req.session.goingTo` is entirely optional. It's a pet peeve of mine that some websites forget what URL you were trying
to access before the login screen intercepted you. This is just a simple solution around that. Store it in the session, restore it
after the login has been successful.

```javascript
exports.isAuthenticated = function (role) {

    return function (req, res, next) {

        if (!req.isAuthenticated()) {

            //If the user is not authorized, save the location that was being accessed so we can redirect afterwards.
            req.session.goingTo = req.url;
            res.redirect('/login');
            return;
        }

        //If a role was specified, make sure that the user has it.
        if (role && req.user.role !== role) {
            res.status(401);
            res.render('errors/401');
        }

        next();
    }
}
```

Finally, one more helper function to inject the authenticated user into the response context, so that it's available to the templates, without
having to manually include it in every model to be rendered. (This can be accomplished thanks to [adaro](https://github.com/PayPal/adaro).
```javascript
exports.injectUser = function (req, res, next) {
    if (req.isAuthenticated()) {
        res.locals.user = req.user;
    }
    next();
}
```

We'll also make some changes to `./index.js` to properly configure passport. These changes go in the `app.configure` function.
The serialize and deserialize methods are used so the authenticated user can be persisted via cookies. To serialize we save the user id,
to deserialize, we retrieve it from the db.

```javascript
    //Tell passport to use our newly created local strategy for authentication
    passport.use(auth.localStrategy());

    //Give passport a way to serialize and deserialize a user. In this case, by the user's id.
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function (id, done) {
        User.findOne({_id: id}, function (err, user) {
            done(null, user);
        });
    });
```
[<img src='http://upload.wikimedia.org/wikipedia/commons/thumb/2/25/External.svg/600px-External.svg.png' width='12px' height='12px'/>View commit](https://github.com/lmarkus/Kraken_Example_Passport/commit/70f965c976964596d52b70002b652eddd1ced389)

### Handling Logins
Before we enable authentication, we should have a login page, and also an error page to let our users know that they're not welcome, should authentication fail.
Let's use the generator to quickly create the login page and controller `yo kraken:page login`

#### The controller
`./controllers/login.js` will have three parts:

A *get* action, to display the login form, and any possible errors:
```javascript
app.get('/login', function (req, res) {
     //Include any error messages that come from the login process.
    model.messages = req.flash('error');
    res.render('login', model);
});
```

A *post* action, to receive the username/password from the login form. Here we'll use passport (with our local strategy) to
determine the result of the login. If it succeeds it will redirect to the `/profile` page (Or the users pre-login traget url).
If it fails, it will redirect to the login page again. `failureFlash: true` tells passport to pass along any error message to the response.
(This will make sense in a bit):
```javascript
app.post('/login', function (req, res) {

    passport.authenticate('local', {
        successRedirect: req.session.goingTo || '/profile',
        failureRedirect: "/login",
        failureFlash: true
    })(req, res);

});
```

A *logout* action to terminate the session, and redirect back to the home page:
```javascript
app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});
```

#### The template
`./public/templates/login.dust` is simple, but there are two thing to note.

A list of possible errors (To be passed from the controller)
```html
{?messages}
    <ul>
        {#messages}
            <li>{.}</li>
        {/messages}

    </ul>
{/messages}
```

And the use of the `csrf` token. Without this token, a default Kraken app will reject any post request:
```html
<table>
    <tr>
        <td><label for="username">Login: </label></td>
        <td><input id="username" name="username" type="text"/></td>
    </tr>
    <tr>
        <td><label for="password">Password: </label></td>
        <td><input id="password" name="password" type="password"/></td>
    </tr>
    <tr>
        <td>
            <input type="submit" value="Login"/>
            <input type="hidden" name="_csrf" value="{_csrf}"/>
        </td>
        <td></td>
    </tr>
</table>
```

We'll also create a very simple 401 error page.

[<img src='http://upload.wikimedia.org/wikipedia/commons/thumb/2/25/External.svg/600px-External.svg.png' width='12px' height='12px'/>View commit1](https://github.com/lmarkus/Kraken_Example_Passport/commit/984c0647e6bc72f387ef9da79185ec7b05d0f61c)
and [commit 2](https://github.com/lmarkus/Kraken_Example_Passport/commit/4a3e32dfa1caca0c198276615941d027d0fecd28)

### Configure all the middleware
The next step is telling our Kraken app to start using the passport middleware, as well as the supporting libraries we've created. We'll do this in `./index.js`
under `app.requestBeforeRoute`:

```javascript
server.use(passport.initialize());  //Use Passport for authentication
server.use(passport.session());     //Persist the user in the session
server.use(flash());                //Use flash for saving/retrieving error messages for the user
server.use(auth.injectUser);        //Inject the authenticated user into the response context
```

[<img src='http://upload.wikimedia.org/wikipedia/commons/thumb/2/25/External.svg/600px-External.svg.png' width='12px' height='12px'/>View commit](https://github.com/lmarkus/Kraken_Example_Passport/commit/709e917da926d560309b7b921d0cb794c10e0ad2)


### Make a few pages require authentication
The only missing piece now is to actually secure a couple of pages.  Let's modify the `./controllers/admin.js` and `./controllers/profile.js` controllers:

For `profile` we just need the user to be authenticated, so we'll change the *get* method signature to use the `auth` library:

```javascript
app.get('/profile', auth.isAuthenticated(), function (req, res) {

    res.render('profile', model);
});
```

For `admin` we'll make a similar change, **but** we're going to require that the user's role is *admin*:
```javascript
app.get('/admin', auth.isAuthenticated('admin'), function (req, res) {

    res.render('admin', model);
});
```

[<img src='http://upload.wikimedia.org/wikipedia/commons/thumb/2/25/External.svg/600px-External.svg.png' width='12px' height='12px'/>View commit](https://github.com/lmarkus/Kraken_Example_Passport/commit/595989c1500bf339c739a2fa1ecab1d7eb07fb8e)


## Finishing touches
### Getting information about the user
Remember the `auth.injectUser` method? Let's take advantage of the fact that we can now access the logged in user from templates to pull of a few special tricks.

Let's modify the master layout navigation menu one more time to offer a **login** or **logout** option dynamically:

```html
{?user}
    <li><a href="/logout">Logout ( {user.name} ) </a></li>
{:else}
    <li><a href="/login">Log In</a></li>
{/user}
```

We'll also modify the **profile** template to display info about the logged in user:
```html
    <p>You are <strong>{user.name}</strong> and your role is <strong>{user.role}</strong></p>
```
[<img src='http://upload.wikimedia.org/wikipedia/commons/thumb/2/25/External.svg/600px-External.svg.png' width='12px' height='12px'/>View commit](https://github.com/lmarkus/Kraken_Example_Passport/commit/db939890b519b21ec420677b6d880a54bb841b7e)

### Adding users
The system is now ready. There's only one thing we're missing. Users!
Let's manually add two users so we can play with things a bit.

On `./index.js` under `app.configure` let's force two new users in. An administrator and a regular user:

```javascript
//Add two users to the system.
var u1 = new User({
    name: 'Kraken McSquid',
    login: 'kraken',
    password: 'releaseMe',
    role: 'admin'
});

var u2 = new User({
    name: 'Ash Williams',
    login: 'awilliams',
    password: 'boomstick',
    role: 'user'
});

//Ignore errors. In this case, the errors will be for duplicate keys as we run this app more than once.
u1.save();
u2.save();
```

When we next start up our server, these two users will be created.

Go ahead. Give it a spin:

```bash
npm start
```

If you go to the database, and take a look at the store data, you'll notice that the passwords have indeed been hashed:
```bash
$ mongo
> use passportTest
  switched to db passportTest;
> > db.users.find().pretty();
  {
  	"name" : "Kraken McSquid",
  	"login" : "kraken",
  	"password" : "$2a$08$OdpXGr14TuhFmYIEQZnNdezX1//XqkGtH9T3D3FGGl/LtL5RA3dmS",
  	"role" : "admin",
  	"_id" : ObjectId("52c26b0ce4c6020000000001"),
  	"__v" : 0
  }
  {
  	"name" : "Ash Williams",
  	"login" : "awilliams",
  	"password" : "$2a$08$T2qXygvaTPf4p80h4048uO/sEHUlvFWaT5LaufQVwRhvGcWURJ/Bu",
  	"role" : "user",
  	"_id" : ObjectId("52c26b0ce4c6020000000002"),
  	"__v" : 0
  }
```

You can now play with these two users:

`awilliams/boomstick` will have access to `/`, `/profile` but not `/admin`

`kraken/releaseMe` will have access to all pages.

[<img src='http://upload.wikimedia.org/wikipedia/commons/thumb/2/25/External.svg/600px-External.svg.png' width='12px' height='12px'/>View final commit](https://github.com/lmarkus/Kraken_Example_Passport/commit/2ca013e46ed3b6af97f8c0b43564c5c227d956ad)

## And you're done!
This is your example.
If you find any typos, errors, bugs or you have suggestions for improvement, please feel free to open an issue, or send your pull requests.


## Notes

* Even though the passwords are being hashed, they are still being transmitted in plaintext from browser to server.  You should ensure that this connection is encrypted




