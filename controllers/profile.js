'use strict';


var ProfileModel = require('../models/profile'),
    auth = require('../lib/auth');


module.exports = function (app) {

    var model = new ProfileModel();


    app.get('/profile', auth.isAuthenticated(), function (req, res) {

        res.render('profile', model);

    });

};
