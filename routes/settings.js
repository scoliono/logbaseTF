var express = require('express');
var fs = require('fs');
var path = require('path');
var config = require(path.join(__dirname, '..', 'auth.json'));
var router = express.Router();

/* GET settings page. */
router.get('/', (req, res, next) => {
    let data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'options.json')));
    console.log(data);

    res.render('settings', { title: 'LogBaseTF Settings', data: data, config: config });
});

/* POST settings. */
router.post('/', (req, res, next) => {
    console.log(req.body);
    fs.writeFileSync(path.join(__dirname, '..', 'options.json'), JSON.stringify(req.body));

    res.redirect('settings');
});

module.exports = router;
