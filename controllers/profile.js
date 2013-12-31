'use strict';


var ProfileModel = require('../models/profile');


module.exports = function (app) {

    var model = new ProfileModel();


    app.get('/profile', function (req, res) {
        
        res.render('profile', model);
        
    });

};
