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
  req.checkBody('password-confirm', 'Passwords do not match.').equals(req.body.email);

  const errors = req.validationErrors();

  if (errors){
    req.flash('error', errors.map(err => err.msg));
    req.render('register', {title: 'Register', body: req.body, flashes: req.flash()})
    return;
  }
  next();
  

}