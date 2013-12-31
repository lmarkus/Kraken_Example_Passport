'use strict';


var AdminModel = require('../models/admin'),
    auth = require('../lib/auth');


module.exports = function (app) {

    var model = new AdminModel();


    app.get('/admin', auth.isAuthenticated('admin'), function (req, res) {

        res.render('admin', model);

    });

};
