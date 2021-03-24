const config = require("../config/auth.config");
const sendgridTransport = require('nodemailer-sendgrid-transport')
const nodemailer = require('nodemailer')



exports.sendApplication = (req, res) => {
  debugger;
  transporter.sendMail({
    to: "dmitry.arhipenko58@gmail.com",
    from: "mydev1488@gmail.com",
    subject: `Заявка на участь в конференції ${req.body.name}`,
    html: `
              <h3>Заявка на участь</h3>
              <p>Наукова ступінь: ${req.body.degree}</p>
              <p>Посада: ${req.body.position}</p>
              <p>Місце навчання/роботи: ${req.body.place}</p>
              <p>Контактний телефон учасника: ${req.body.phone}</p>
              <p>Email: ${req.body.email}</p>
              <p>Тема наукової роботи: ${req.body.theme}</p>
              <p>Напрям роботи: ${req.body.type}</p>
              `
  })
  res.send({message: 'Заявка на участь успішно відправлена!'})
}
