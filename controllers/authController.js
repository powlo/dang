const passport = require('passport');

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Login Failed',
  successRedirect: '/',
  successFlash: 'Login Success'
})

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are now logged out');
  res.redirect('/');
}

//middleware
exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()){
    next();
    return;
  }
  req.flash('error', 'Please log in.');
  res.redirect('/login');
}