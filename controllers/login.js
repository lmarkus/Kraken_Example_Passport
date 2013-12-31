'use strict';


var LoginModel = require('../models/login');


module.exports = function (app) {

    var model = new LoginModel();


    app.get('/login', function (req, res) {
        
        res.render('login', model);
        
    });

};
