const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.loginForm = (req,res) => {
  res.render('login', {title: "Login"});
}

exports.registerForm = (req,res) => {
  res.render('register', {title: "Register"});
}

exports.validateRegister = (req, res, next) => {
  
  //All of these validators come from the express-validator middleware
  //which is set up in app.js.
  req.sanitizeBody('name');
  req.checkBody('name', 'You must provide a name.').notEmpty();
  req.checkBody('email', 'That email is not valid.').isEmail();
  req.sanitizeBody('email').normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  });
  req.checkBody('password', 'Password cannot be blank.').notEmpty();
  req.checkBody('password-confirm', 'You must confirm your password.').notEmpty();
  req.checkBody('password-confirm', 'Passwords do not match.').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors){
    req.flash('error', errors.map(err => err.msg));
    res.render('register', {title: 'Register', body: req.body, flashes: req.flash()})
    return;
  }
  next();
}

exports.register = async (req, res, next) => {
  const user = new User({email: req.body.email, name: req.body.name});
  //User.register comes from passportLocalMongoose and handles account generation with password hash
  //ES6 Promisify replaces this: User.register(user, request.body.password, function(err, user){});
  const register = promisify(User.register, User);
  await register(user, req.body.password);
  next();
}