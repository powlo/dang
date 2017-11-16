

const nodemailer = require('nodemailer'); //Thing that sends emails.
const pug = require('pug'); //Renders pug templates.
const juice = require('juice');
const htmlToText = require('html-to-text'); //Converts html to text.
const promisify = require('es6-promisify'); //Lets you do async / await.

const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

const generateHTML = (filename, options = {}) => {
  const html = pug.renderFile(`${__dirname}/../views/email/${filename}.pug`, options);
  const inlined = juice(html);
  return inlined;
}

exports.send = async (options) => {
  const html = generateHTML(options.filename, options);
  const text = htmlToText.fromString(html);
  const mailOptions = {
    from: 'Dang Delicious <dang@delicious.com>',
    to: options.user.email,
    html: html,
    text: text
  };

  const sendMail = promisify(transport.sendMail, transport);

  return sendMail(mailOptions);
}