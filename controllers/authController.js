const mongoose = require('mongoose');
const passport = require('passport');
const crypto = require('crypto');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');
const User = mongoose.model('User');

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

exports.forgot = async (req, res) => {
  //1. See if the user exists.
  const user = await User.findOne({ email: req.body.email });
  if (!user){
    req.flash('success', 'You have been emailed a password link.');
    res.redirect('/login');
  }

  //2. set token with expiry.
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000; //1 hour
  await user.save();

  //3. Send email with token.

  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
  await mail.send({
    user: user,
    subject: 'Password reset.',
    resetURL: resetURL,
    filename: 'password-reset'
  });
  req.flash('success', `You have been emailed a password link.`)

  //4. Redirect to login page.
  res.redirect('/login');
}

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: {$gt: Date.now()}
  });
  if (!user) {
    req.flash('error', 'Password reset token is invalid or expired.');
    res.redirect('/login');
  }
  res.render('reset', {title: 'Reset your password'})
}

exports.confirmedPasswords = (req, res, next) => {
  req.checkBody('password', 'Password cannot be blank.').notEmpty();
  req.checkBody('password-confirm', 'You must confirm your password.').notEmpty();
  req.checkBody('password-confirm', 'Passwords do not match.').equals(req.body.password);

  const errors = req.validationErrors();
  
  if (errors){
    req.flash('error', errors.map(err => err.msg));
    res.redirect('back');
    return;
  }
  next();
}

exports.update = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: {$gt: Date.now()}
  });

  if (!user) {
    req.flash('error', 'Password reset token is invalid or expired.');
    res.redirect('/login');
  }

  setPassword = promisify(user.setPassword, user);
  await user.setPassword(req.body.password);

  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  const updatedUser = await user.save();

  await req.login(updatedUser);
  req.flash('success', 'Your password has been reset.');
  res.redirect('/');
}